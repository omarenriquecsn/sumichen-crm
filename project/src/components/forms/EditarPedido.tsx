import { useEffect, useMemo, useState } from "react";
import { Almacen, formInstrumento, formProducto, Pedido, PedidoData, Producto, Transporte } from "../../types";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { toast } from "react-toastify";
import { useSupabase } from "../../hooks/useSupabase";
import SelectorDeProductos from "../ui/SelectProductos";
import SelectInstrumentos from "../ui/SelectInstrumentos";
import { decimalesDePrecio } from "../../utils/pedidos";

type EditarPedidoProps = {
  onSubmit: (data: PedidoData) => void;
  accion: string;
  dataProps?: Partial<Pedido>;
};

const EditarPedido = ({ onSubmit, accion, dataProps }: EditarPedidoProps) => {
  const supabase = useSupabase();

  accion = accion || "Actualizar Pedido";

  // Líneas actuales del pedido convertidas al formato del selector.
  const lineasOriginales = useMemo<formProducto[]>(() => {
    type LineaPedidoRaw = {
      producto_id: string;
      cantidad?: number;
      precio_unitario?: number;
      precio_base?: number;
      porcentaje_negociacion?: number;
      almacen?: Almacen;
      nombre?: string;
      producto?: Producto;
    };
    const lineas = (dataProps?.productos_pedido ?? []) as LineaPedidoRaw[];
    return lineas.map((pp) => {
      const base = Number(pp.precio_base ?? pp.producto?.precio_base ?? 0);
      return {
        producto_id: pp.producto_id,
        cantidad: Number(pp.cantidad) || 1,
        precio_base: base,
        porcentaje_negociacion: Number(pp.porcentaje_negociacion) || 0,
        precio_unitario: Number(pp.precio_unitario ?? base) || base,
        nombre: pp.producto?.nombre ?? pp.nombre ?? "",
        descripcion: pp.producto?.descripcion ?? "",
        almacen: pp.almacen,
        decimales: decimalesDePrecio(base),
      };
    });
  }, [dataProps]);

  const [productosSeleccionados, setProductosSeleccionados] =
    useState<formProducto[]>(lineasOriginales);

  const [formData, setFormData] = useState<Partial<Pedido>>({
    id: dataProps?.id || "",
    vendedor_id: dataProps?.vendedor_id || "",
    cliente_id: dataProps?.cliente_id || "",
    numero: dataProps?.numero || "",
    fecha_creacion: dataProps?.fecha_creacion || new Date(),
    fecha_entrega: dataProps?.fecha_entrega || new Date(),
    total: dataProps?.total || 0,
    subtotal: dataProps?.subtotal || 0,
    impuestos: dataProps?.impuestos || 0,
    tipo_pago: dataProps?.tipo_pago || "contado",
    dias_credito: dataProps?.dias_credito || 0,
    notas: dataProps?.notas || "",
    transporte: dataProps?.transporte || "interno",
    moneda: dataProps?.moneda || "usd",
  });

  const [transporte_detalle, setTransporteDetalle] = useState<
    Partial<Transporte>
  >({
    nombre: "",
    cedula: "",
    marca: "",
    modelo: "",
    placa: "",
    ...(dataProps?.transporte_detalle ?? {}),
  });

  const {
    data: productos,
    isLoading: loadingProductos,
    error: errorProductos,
  } = supabase.useStockProductos();

  const { data: tiposInstrumento } = supabase.useTiposInstrumento();
  const { data: stockInstrumentos } = supabase.useStockInstrumentos();
  const { data: instrumentosPedido } = supabase.useInstrumentosPedido(
    dataProps?.id,
  );

  const [instrumentos, setInstrumentos] = useState<formInstrumento[]>([]);
  useEffect(() => {
    if (instrumentosPedido) {
      setInstrumentos(
        instrumentosPedido.map((l) => ({
          tipo_instrumento_id: l.tipo_instrumento_id,
          nombre: l.tipo_instrumento?.nombre ?? "Instrumento",
          almacen: l.almacen,
          cantidad:
            Number(l.cantidad_transito) + Number(l.cantidad_cliente) ||
            Number(l.cantidad),
        })),
      );
    }
  }, [instrumentosPedido]);

  if (errorProductos) {
    toast.error("Error al cargar los productos");
    return;
  }

  if (loadingProductos) {
    return <LoadingSpinner />;
  }

  if (!productos) {
    toast.error("No hay productos");
    return;
  }

  // El stock del pedido actual está reservado, así que se suma de vuelta a la
  // disponibilidad para poder reasignar almacén/cantidad al editar.
  const productosConStock = (productos as Producto[]).map((p) => ({
    ...p,
    stock: { ...(p.stock ?? { globalca: 0, wms: 0, total: 0 }) },
  }));
  const productosMap = new Map(productosConStock.map((p) => [p.id, p]));
  for (const linea of lineasOriginales) {
    if (!linea.almacen) continue;
    const p = productosMap.get(linea.producto_id);
    if (!p?.stock) continue;
    const cantidad = Number(linea.cantidad) || 0;
    p.stock[linea.almacen] += cantidad;
    p.stock.total += cantidad;
  }

  const productosDisponibles = productosConStock.filter(
    (p) => (p.stock?.total ?? 0) > 0,
  );

  // Los instrumentos del pedido están fuera; se suman de vuelta para mostrarlos
  // disponibles al reasignarlos.
  const stockInstrumentosAjustado = (stockInstrumentos ?? []).map((s) => ({
    ...s,
  }));
  for (const l of instrumentosPedido ?? []) {
    const s = stockInstrumentosAjustado.find(
      (x) =>
        x.tipo_instrumento_id === l.tipo_instrumento_id &&
        x.almacen === l.almacen,
    );
    if (s) {
      s.cantidad_disponible =
        Number(s.cantidad_disponible) +
        Number(l.cantidad_transito) +
        Number(l.cantidad_cliente);
    }
  }

  const handleOnChage = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleTransporteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTransporteDetalle((prev) => ({ ...prev, [name]: value }));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    const target = e.target as HTMLElement;
    const isTextarea = target.tagName === "TEXTAREA";

    if (e.key === "Enter" && !isTextarea) {
      e.preventDefault();
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const sinAlmacen = productosSeleccionados.find((p) => !p.almacen);
    if (sinAlmacen) {
      toast.error(
        `Selecciona el almacén para "${sinAlmacen.nombre}" antes de guardar.`,
      );
      return;
    }

    const pedidoConProductos = {
      ...formData,
      productos: productosSeleccionados,
      instrumentos,
      transporte_detalle:
        formData.transporte === "externo" ? transporte_detalle : undefined,
    } as PedidoData;
    onSubmit(pedidoConProductos);
  };

  return (
    <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-4">
      <div className="space-y-4 p-6 bg-white">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          Editar Pedido N° {formData.numero}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="fecha_entrega"
              className="block text-sm font-medium text-gray-700"
            >
              Fecha de Entrega
            </label>
            <input
              type="date"
              name="fecha_entrega"
              id="fecha_entrega"
              value={
                formData.fecha_entrega
                  ? new Date(formData.fecha_entrega).toISOString().split("T")[0]
                  : ""
              }
              onChange={handleOnChage}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="tipo_pago"
              className="block text-sm font-medium text-gray-700"
            >
              Tipo de Pago
            </label>
            <select
              name="tipo_pago"
              id="tipo_pago"
              value={formData.tipo_pago}
              onChange={handleOnChage}
              className="mt-1 block w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm bg-white"
            >
              <option value="contado">Contado</option>
              <option value="credito">Crédito</option>
            </select>
          </div>
          {formData.tipo_pago === "credito" && (
            <div>
              <label
                htmlFor="dias_credito"
                className="block text-sm font-medium text-gray-700"
              >
                Días de Crédito
              </label>
              <input
                type="number"
                name="dias_credito"
                id="dias_credito"
                value={formData.dias_credito}
                onChange={handleOnChage}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          )}
          <div>
            <label
              htmlFor="transporte"
              className="block text-sm font-medium text-gray-700"
            >
              Transporte
            </label>
            <select
              name="transporte"
              id="transporte"
              value={formData.transporte}
              onChange={handleOnChage}
              className="mt-1 block w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm bg-white"
            >
              <option value="interno">Interno</option>
              <option value="externo">Externo</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="impuestos"
              className="block text-sm font-medium text-gray-700"
            >
              Impuestos
            </label>
            <select
              name="impuestos"
              id="impuestos"
              value={formData.impuestos}
              onChange={handleOnChage}
              className="mt-1 block w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm bg-white"
            >
              <option value="0.16">IVA</option>
              <option value="0">Exento</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="moneda"
              className="block text-sm font-medium text-gray-700"
            >
              Moneda
            </label>
            <select
              name="moneda"
              id="moneda"
              value={formData.moneda}
              onChange={handleOnChage}
              className="mt-1 block w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm bg-white"
            >
              <option value="usd">usd</option>
              <option value="bs">bs</option>
            </select>
          </div>

          {formData.transporte === "externo" && (
            <div className="col-span-1 md:col-span-2 border rounded-lg p-4 bg-gray-50 space-y-4">
              <h4 className="font-semibold text-gray-700">
                Datos del Transporte
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">
                    Nombre
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    id="nombre"
                    value={transporte_detalle.nombre}
                    onChange={handleTransporteChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="cedula" className="block text-sm font-medium text-gray-700">
                    Cédula
                  </label>
                  <input
                    type="text"
                    name="cedula"
                    id="cedula"
                    value={transporte_detalle.cedula}
                    onChange={handleTransporteChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="marca" className="block text-sm font-medium text-gray-700">
                    Marca
                  </label>
                  <input
                    type="text"
                    name="marca"
                    id="marca"
                    value={transporte_detalle.marca}
                    onChange={handleTransporteChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="modelo" className="block text-sm font-medium text-gray-700">
                    Modelo
                  </label>
                  <input
                    type="text"
                    name="modelo"
                    id="modelo"
                    value={transporte_detalle.modelo}
                    onChange={handleTransporteChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="placa" className="block text-sm font-medium text-gray-700">
                    Placa
                  </label>
                  <input
                    type="text"
                    name="placa"
                    id="placa"
                    value={transporte_detalle.placa}
                    onChange={handleTransporteChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {productosDisponibles.length === 0 && (
          <p className="mb-2 text-sm font-medium text-amber-600">
            No hay productos con stock disponible.
          </p>
        )}
        <SelectorDeProductos
          productos={productosDisponibles}
          seleccionInicial={lineasOriginales}
          onSeleccionar={(seleccion) => setProductosSeleccionados(seleccion)}
        />

        <div className="border-t pt-4">
          <h4 className="font-semibold text-gray-800 mb-1">
            Instrumentos retornables (opcional)
          </h4>
          <p className="text-sm text-gray-500 mb-3">
            Paletas, tambores, baritanques o carboyas que se prestan con el
            pedido.
          </p>
          <SelectInstrumentos
            key={instrumentosPedido ? "instrumentos-listas" : "instrumentos-cargando"}
            tipos={tiposInstrumento ?? []}
            stock={stockInstrumentosAjustado}
            almacenes={["globalca", "wms"]}
            seleccionInicial={instrumentos}
            onSeleccionar={setInstrumentos}
          />
        </div>

        <div>
          <label
            htmlFor="notas"
            className="block text-sm font-medium text-gray-700"
          >
            Notas del Pedido
          </label>
          <textarea
            name="notas"
            id="notas"
            value={formData.notas}
            onChange={(e) =>
              setFormData({ ...formData, notas: e.target.value })
            }
            rows={3}
            className="mt w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
          />
        </div>
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={productosSeleccionados.length === 0}
            className="bg-blue-600 hover:bg-blue-700 transition-colors text-white px-6 py-2 rounded-lg font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {accion}
          </button>
        </div>
      </div>
    </form>
  );
};

export default EditarPedido;
