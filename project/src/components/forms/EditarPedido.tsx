import { useState } from "react";
import { formProducto, Pedido, PedidoData, Producto } from "../../types";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { toast } from "react-toastify";
import { useSupabase } from "../../hooks/useSupabase";
import SelectorDeProductos from "../ui/SelectProductos";

type EditarPedidoProps = {
  onSubmit: (data: PedidoData) => void;
  accion: string;
    dataProps?: Partial<Pedido>;
};

const CrearPedido = ({ onSubmit, accion, dataProps }: EditarPedidoProps) => {
  const supabase = useSupabase();

  accion = accion || "Actualizar Pedido";

  const [productosSeleccionados, setProductosSeleccionados] = useState<
    formProducto[]
  >([]);

  // Inicializar productos seleccionados desde dataProps solo una vez


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

  // Estado para el archivo adjunto


  const {
    data: productos,
    isLoading: loadingProductos,
    error: errorProductos,
  } = supabase.useProductos();

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

  const handleOnChage = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };



  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    const target = e.target as HTMLElement;
    const isTextarea = target.tagName === "TEXTAREA";

    if (e.key === "Enter" && !isTextarea) {
      e.preventDefault(); // bloquea Enter solo fuera del textarea
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const pedidoConProductos = {
      ...formData,
      productos: productosSeleccionados,
    } as PedidoData;
    onSubmit(pedidoConProductos);
  };
  return (
    <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-4">
      <div className="space-y-4 p-6 bg-white">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          Crear Nuevo Pedido
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
              <option value="interno">usd</option>
              <option value="externo">bs</option>
            </select>
          </div>
        </div>

        <SelectorDeProductos
          productos={productos}
          onSeleccionar={(seleccion) => setProductosSeleccionados(seleccion)}
        />
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
        {productosSeleccionados.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="font-semibold">Resumen de Productos:</h4>
            {productosSeleccionados.map((p) => (
              <p key={p.producto_id}>
                {p.cantidad} x{" "}
                {
                  productos.find((prod: Producto) => prod.id === p.producto_id)
                    ?.nombre
                }{" "}
                = ${(p.cantidad * p.precio_unitario).toFixed(2)}
              </p>
            ))}
          </div>
        )}
        {/* Sección para cargar archivo */}
      
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={productosSeleccionados.length === 0 }
            className="bg-blue-600 hover:bg-blue-700 transition-colors text-white px-6 py-2 rounded-lg font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {accion}
          </button>
        </div>
      </div>
    </form>
  );
};

export default CrearPedido;
