import { User } from "@supabase/supabase-js";
import { Cliente, formProducto, Pedido, PedidoData, Actividad } from "../types";
import { toast } from "react-toastify";
import { UseMutateFunction } from "@tanstack/react-query";

export interface HandleCrearPedidoParams {
  data: PedidoData;
  currentUser: User;
  clienteSeleccionado: string | null;
  nuevoPedido: (
    params: {
      pedidoData: Partial<Pedido>;
      currentUser: User;
      productosPedido: formProducto[];
      archivoAdjunto: FileList | null;
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
      archivoAdjunto: (data.archivoAdjunto instanceof FileList ? data.archivoAdjunto : null),
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
  }: {
    cliente: Cliente;
    currentUser: import("@supabase/supabase-js").User;
    navigate: import("react-router-dom").NavigateFunction;
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
      `Estimado ${cliente.nombre}, nos alegra contactarte.`
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
