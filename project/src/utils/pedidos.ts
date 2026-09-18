import { User } from "@supabase/supabase-js";
import {
  Cliente,
  CotizacionParseada,
  formProducto,
  Pedido,
  PedidoData,
  Producto,
  Actividad,
} from "../types";
import { toast } from "react-toastify";
import { UseMutateFunction } from "@tanstack/react-query";
import { armarCuerpoConFirma } from "./firma";

/** Formatea un tamaño en bytes a un texto legible (B/KB/MB). */
export const formatearTamanoArchivo = (bytes?: number | null): string => {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export interface HandleCrearPedidoParams {
  data: PedidoData;
  currentUser: User;
  clienteSeleccionado: string | null;
  nuevoPedido: (
    params: {
      pedidoData: Partial<Pedido>;
      currentUser: User;
      productosPedido: formProducto[];
      archivoAdjunto: File[] | FileList | null;
    },
    callbacks: {
      onError: (error: unknown) => void;
      onSuccess: () => void;
    }
  ) => void;
  setModalPedidoVisible: (v: boolean) => void;
}
export interface HandleActualizarPedidoParams {
  data: Partial<PedidoData>;
  currentUser: User;
  actualizarPedido: UseMutateFunction<
    void,
    unknown,
    {
      pedidoData: Partial<Pedido>;
      currentUser: User;
    }
  >;
}

export function handleCrearPedidoUtil({
  data,
  currentUser,
  clienteSeleccionado,
  nuevoPedido,
  setModalPedidoVisible,
}: HandleCrearPedidoParams) {
  if (!currentUser) {
    toast.error("Debes iniciar sesión para crear un pedido");
    return;
  }
  if (
    !data.productos ||
    !Array.isArray(data.productos) ||
    data.productos.length === 0
  ) {
    toast.error("Debes agregar al menos un producto al pedido");
    return;
  }

  // Asignar cliente si no viene en data
  if (!data.cliente_id && clienteSeleccionado) {
    data.cliente_id = clienteSeleccionado;
  }

  const { productos, ...rest } = data;

  // Calcular subtotal y total de forma robusta
  const subtotal = productos.reduce(
    (sum, p) =>
      sum + (Number(p.precio_unitario) || 0) * (Number(p.cantidad) || 0),
    0
  );
  const impuestos = Number(rest.impuestos) || 0;
  rest.subtotal = subtotal;
  rest.total = subtotal + subtotal * impuestos;

  nuevoPedido(
    {
      pedidoData: { ...rest },
      currentUser,
      productosPedido: productos,
      archivoAdjunto:
        data.archivoAdjunto instanceof FileList
          ? Array.from(data.archivoAdjunto)
          : Array.isArray(data.archivoAdjunto)
            ? data.archivoAdjunto
            : data.archivoAdjunto instanceof File
              ? [data.archivoAdjunto]
              : null,
    },
    {
      onError: async (error: unknown) => {
        let errorMsg = "Error al crear el pedido";
        if (error instanceof Error) {
          errorMsg = error.message;
        }
        toast.error(errorMsg);
      },
      onSuccess: () => {
        toast.success("¡Pedido creado exitosamente!");
        setModalPedidoVisible(false);
      },
    }
  );
}

export const handleActualizarPedidoUtil = async ({
  data,
  currentUser,
  actualizarPedido,
}: HandleActualizarPedidoParams) => {
  if (!currentUser) {
    toast.error("Debes iniciar sesión para crear un pedido");
    return;
  }

  actualizarPedido(
    {
      pedidoData: { ...data },
      currentUser,
    },
    {
      onError: async (error: unknown) => {
        let errorMsg = "Error al crear el pedido";
        if (error instanceof Error) {
          errorMsg = error.message;
        }
        toast.error(errorMsg);
      },
      onSuccess: () => {
        toast.success("¡Pedido actualizado exitosamente!");
      },
    }
  );
};



/** Normaliza un RIF para comparar (solo letras y dígitos, mayúsculas). */
export const normalizarRif = (rif?: string) =>
  (rif || "").replace(/[^a-z0-9]/gi, "").toUpperCase();

/** Normaliza un código de producto (mayúsculas, sin espacios). */
export const normalizarCodigoProducto = (codigo?: string) =>
  (codigo || "").trim().toUpperCase().replace(/\s+/g, "");

/** Redondea un número a la cantidad de decimales indicada. */
export const redondearA = (n: number, decimales: number) => {
  const factor = 10 ** decimales;
  return Math.round((Number(n) || 0) * factor) / factor;
};

/**
 * Determina si un precio usa la ruta de 4 decimales: un precio es "especial"
 * cuando tiene más de 2 decimales (ej. preformas a 0.0091). Los precios con 2
 * decimales o menos siguen la ruta normal de 2 decimales.
 */
export const decimalesDePrecio = (precio?: number | string): 2 | 4 => {
  const n = Number(precio) || 0;
  return redondearA(n, 4) !== redondearA(n, 2) ? 4 : 2;
};

/**
 * Despeja el precio base desde el precio unitario y el % de negociación, con la
 * misma fórmula del formulario: `unitario = base + base * (%/100)`.
 *
 * Con `decimales = 2` el comportamiento es idéntico al de siempre. Con
 * `decimales = 4` (productos especiales) se conservan 4 decimales sin redondear
 * a 2.
 */
export const precioBaseDesdeUnitario = (
  precioUnitario: number,
  porcentaje: number,
  decimales: number = 2,
) => {
  const factor = 1 + (Number(porcentaje) || 0) / 100;
  if (factor <= 0) return Number(precioUnitario) || 0;
  return redondearA((Number(precioUnitario) || 0) / factor, decimales);
};

export interface ResultadoCotizacion {
  clienteId: string | null;
  clienteEncontrado: boolean;
  pedidoInicial: Partial<Pedido> & { productos?: formProducto[] };
  /** Códigos de la cotización que no existen en el catálogo. */
  codigosSinMatch: string[];
  /** Códigos que existen en el catálogo pero están sin stock (disponible=false). */
  codigosSinStock: string[];
  productosCargados: number;
}

/**
 * Convierte una cotización parseada en los datos iniciales del formulario de
 * pedidos: matchea el cliente por RIF y los productos por código contra el
 * catálogo, y despeja el precio base de cada producto.
 */
export const construirPedidoDesdeCotizacion = (
  data: CotizacionParseada,
  clientes: Cliente[],
  catalogo: Producto[],
): ResultadoCotizacion => {
  const rifNorm = normalizarRif(data.cliente.rifNormalizado || data.cliente.rif);
  const cliente = clientes.find((c) => normalizarRif(c.rif) === rifNorm);

  const porCodigo = new Map<string, Producto>();
  (catalogo || []).forEach((p) =>
    porCodigo.set(normalizarCodigoProducto(p.descripcion), p),
  );

  const pct = Number(data.porcentajeNegociacion) || 0;
  const productos: formProducto[] = [];
  const codigosSinMatch: string[] = [];
  const codigosSinStock: string[] = [];
  let algunoConIva = false;

  (data.productos || []).forEach((prod) => {
    const match = porCodigo.get(normalizarCodigoProducto(prod.codigo));
    if (!match) {
      codigosSinMatch.push(prod.codigo);
      return;
    }
    // Existe en el catálogo pero hoy no tiene stock: no se precarga.
    if (match.disponible === false) {
      codigosSinStock.push(prod.codigo);
      return;
    }
    if (!prod.exento) algunoConIva = true;
    // Ruta de 4 decimales para productos especiales (precio base con >2
    // decimales, ej. preformas a 0.0091); el resto sigue con 2.
    const decimales = decimalesDePrecio(match.precio_base);
    productos.push({
      producto_id: match.id,
      cantidad: prod.cantidad,
      precio_base: precioBaseDesdeUnitario(prod.precioUnitario, pct, decimales),
      porcentaje_negociacion: pct,
      precio_unitario: prod.precioUnitario,
      nombre: match.nombre,
      descripcion: match.descripcion,
      decimales,
    });
  });

  const pedidoInicial: Partial<Pedido> & { productos?: formProducto[] } = {
    cliente_id: cliente?.id ?? "",
    impuestos: algunoConIva ? 0.16 : 0,
    moneda: data.moneda,
    tipo_pago: data.tipoPago ?? "contado",
    dias_credito:
      data.tipoPago === "credito" ? (data.diasCredito ?? 0) : 0,
    transporte: data.transporte ?? "interno",
    fecha_entrega: data.fechaEntrega
      ? new Date(`${data.fechaEntrega}T12:00:00`)
      : new Date(),
    notas: data.cotizacion ? `Cotización N° ${data.cotizacion}` : "",
    productos,
  };

  return {
    clienteId: cliente?.id ?? null,
    clienteEncontrado: !!cliente,
    pedidoInicial,
    codigosSinMatch,
    codigosSinStock,
    productosCargados: productos.length,
  };
};

export const getEstadoColor = (estado: string) => {
  switch (estado) {
    case "borrador":
      return "bg-gray-100 text-gray-800";
    case "enviado":
      return "bg-blue-100 text-blue-800";
    case "aprobado":
      return "bg-green-100 text-green-800";
    case "rechazado":
      return "bg-red-100 text-red-800";
    case "procesando":
      return "bg-yellow-100 text-yellow-800";
    case "completado":
      return "bg-emerald-100 text-emerald-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export const utilsPedidos = (pedidos: Pedido[], cliente: Cliente) => {
  const pedidosFiltrados = () => {
    const pedidosFiltradosVendedor = (
      Array.isArray(pedidos) ? pedidos : []
    ).filter((pedido) => pedido.cliente_id === cliente.id);
    return pedidosFiltradosVendedor;
  };
  const hoy = new Date();

  const ultimaCompra =
    pedidosFiltrados()?.length ?? 0 > 0
      ? pedidosFiltrados()?.reduce((prev: Pedido, curr: Pedido) => {
          const fechaPrev = new Date(prev.fecha_creacion);
          const fechaCurr = new Date(prev.fecha_creacion);

          const diffPrev = Math.abs(hoy.getDate() - fechaPrev.getDate());
          const diffCurr = Math.abs(hoy.getDate() - fechaCurr.getDate());

          return diffCurr < diffPrev ? curr : prev;
        })
      : null;

  /**
   * Abre Gmail y crea una actividad automáticamente
   * @param {object} params - Parámetros necesarios
   * @param {Cliente} params.cliente - Cliente destinatario
   * @param {User} params.currentUser - Usuario actual
   * @param {NavigateFunction} params.navigate - Función de navegación
   * @param {function} params.crearActividad - Función para crear actividad
   */
  const abrirGmail = async ({
    cliente,
    currentUser,
    navigate,
    crearActividad,
    firmaUrl,
  }: {
    cliente: Cliente;
    currentUser: import("@supabase/supabase-js").User & {
      rol?: "vendedor" | "admin";
    };
    navigate: import("react-router-dom").NavigateFunction;
    firmaUrl?: string;
    crearActividad: (
      params: {
        actividadData: Partial<Actividad>;
        currentUser:
          | import("@supabase/supabase-js").User
          | Partial<import("@supabase/supabase-js").User>;
      },
      callbacks: {
        onSuccess: () => void;
        onError: (error: unknown) => void;
      }
    ) => void;
  }) => {
    const destinatario = encodeURIComponent(cliente.email);
    const asunto = encodeURIComponent("¡Hola desde Sumichem!");
    const cuerpo = encodeURIComponent(
      armarCuerpoConFirma(
        `Estimado ${cliente.nombre}, nos alegra contactarte.`,
        firmaUrl,
      ),
    );

    const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${destinatario}&su=${asunto}&body=${cuerpo}`;
    window.open(url, "_blank"); // Abre Gmail en nueva pestaña

    // Crear actividad automáticamente
    const actividadData: Partial<Actividad> = {
      titulo: `Email a la empresa ${cliente.empresa}`,
      descripcion: `Correo enviado a ${cliente.empresa}`,
      tipo: "email",
      cliente_id: cliente.id,
      fecha: new Date(),
      vendedor_id: currentUser.id,
      completado: true, // Estado inicial de la actividad
    };
    // Importar y usar handleCrearActividadUtil
    try {
      // handleCrearActividadUtil debe estar importada en este archivo
      if (typeof crearActividad === "function") {
        // Llamada directa a la función utilitaria
        import("./actividades").then(({ handleCrearActividadUtil }) => {
          handleCrearActividadUtil({
            data: actividadData,
            currentUser: {
              ...currentUser,
              rol: currentUser.rol === "vendedor" || currentUser.rol === "admin" ? currentUser.rol : undefined,
            },
            navigate,
            crearActividad,
          });
        });
      }
    } catch (error) {
      // Si hay error, solo muestra en consola
      console.error("Error creando actividad de correo:", error);
    }
  };

  return {
    pedidosFiltrados,
    ultimaCompra,
    abrirGmail,
  };
};
