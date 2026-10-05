import { useSupabase } from "../../hooks/useSupabase";
import React from "react";
import { Layout } from "../layout/Layout";
import { useAuth } from "../../context/useAuth";
import { toast } from "react-toastify";

const hoy = () => new Date().toISOString().slice(0, 10);

const estadoInicial = () => ({
  nombre: "",
  descripcion: "",
  unidad_medida: "kg",
  precio_base: "",
  disponible: true,
  // Stock inicial (opcional)
  almacen: "globalca",
  cantidad: "",
  lote: "",
  fecha_ingreso: hoy(),
  fecha_vencimiento: "",
});

const AgregarProducto = () => {
  const [formData, setFormData] = React.useState(estadoInicial());
  const { mutate: crearProducto, isPending } = useSupabase().useCrearProducto();
  const { userData } = useAuth();

  const inputClass =
    "w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelClass = "block text-gray-700 font-medium mb-1";

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]:
        type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const nombre = formData.nombre.trim();
    const descripcion = formData.descripcion.trim();
    if (!nombre) return toast.error("El nombre es obligatorio");
    if (!descripcion) return toast.error("El código es obligatorio");

    const cantidad = Number(formData.cantidad) || 0;
    const conStock = cantidad > 0;
    if (conStock) {
      if (!formData.lote.trim())
        return toast.error("El código de lote es obligatorio para el stock inicial");
      if (!formData.fecha_ingreso)
        return toast.error("La fecha de ingreso es obligatoria para el stock inicial");
    }

    const productoData: {
      nombre: string;
      descripcion: string;
      unidad_medida: string;
      precio_base: number;
      disponible: boolean;
      stock_inicial?: {
        almacen: string;
        cantidad: number;
        lote: string;
        fecha_ingreso: string;
        fecha_vencimiento: string | null;
      };
    } = {
      nombre,
      descripcion,
      unidad_medida: formData.unidad_medida,
      precio_base: Number(formData.precio_base) || 0,
      disponible: formData.disponible,
    };

    if (conStock) {
      productoData.stock_inicial = {
        almacen: formData.almacen,
        cantidad,
        lote: formData.lote.trim(),
        fecha_ingreso: formData.fecha_ingreso,
        fecha_vencimiento: formData.fecha_vencimiento || null,
      };
    }

    crearProducto(
      { productoData },
      {
        onSuccess: (data) => {
          const res = data as {
            productoExistente?: boolean;
            loteRegistrado?: boolean;
          };
          if (res?.productoExistente) {
            toast.success(
              res.loteRegistrado
                ? "Producto existente actualizado y lote registrado"
                : "Producto existente actualizado"
            );
          } else {
            toast.success(
              res?.loteRegistrado
                ? "¡Producto creado con stock inicial!"
                : "¡Producto agregado exitosamente!"
            );
          }
          setFormData(estadoInicial());
        },
        onError: (err: unknown) => {
          toast.error(
            err instanceof Error ? err.message : "Error al agregar el producto"
          );
        },
      }
    );
  };

  return (
    <Layout
      title={`¡Bienvenido, ${userData?.nombre}!`}
      subtitle="Carga un nuevo producto"
    >
      <div className="flex items-center justify-center min-h-[60vh] py-6">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-2xl">
          <h1 className="text-2xl font-bold mb-2 text-center text-gray-800">
            Agregar Producto
          </h1>
          <p className="text-sm text-gray-500 text-center mb-6">
            Si el código ya existe, se actualizará el producto y se registrará
            el nuevo lote con sus fechas, almacén y cantidad.
          </p>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Datos del producto */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={labelClass}>Nombre</label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="Nombre del producto"
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Código</label>
                <input
                  type="text"
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="Código del producto (ej. MP10052)"
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Unidad de medida</label>
                <select
                  name="unidad_medida"
                  value={formData.unidad_medida}
                  onChange={handleChange}
                  className={inputClass}
                >
                  <option value="kg">KG (kilogramos)</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Precio Base ($/kg)</label>
                <input
                  type="number"
                  name="precio_base"
                  value={formData.precio_base}
                  onChange={handleChange}
                  min="0"
                  step="0.0001"
                  className={inputClass}
                  placeholder="0.00"
                />
              </div>

              <div className="flex items-center gap-3 pt-6">
                <input
                  id="disponible"
                  type="checkbox"
                  name="disponible"
                  checked={formData.disponible}
                  onChange={handleChange}
                  className="h-5 w-5 text-blue-600 rounded border-gray-300"
                />
                <label htmlFor="disponible" className="text-gray-700 font-medium">
                  Disponible para pedidos
                </label>
              </div>
            </div>

            {/* Stock inicial */}
            <div className="border-t border-gray-200 pt-5">
              <h2 className="text-lg font-semibold text-gray-800 mb-1">
                Stock inicial <span className="text-sm font-normal text-gray-500">(opcional)</span>
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Si cargas una cantidad, se crea un lote en el almacén indicado.
                Sin stock, el producto no aparecerá en el selector de pedidos.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Almacén</label>
                  <select
                    name="almacen"
                    value={formData.almacen}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="globalca">Globalca</option>
                    <option value="wms">WMS</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Cantidad (kg)</label>
                  <input
                    type="number"
                    name="cantidad"
                    value={formData.cantidad}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    className={inputClass}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className={labelClass}>Lote</label>
                  <input
                    type="text"
                    name="lote"
                    value={formData.lote}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="Código del lote"
                  />
                </div>

                <div>
                  <label className={labelClass}>Fecha de ingreso</label>
                  <input
                    type="date"
                    name="fecha_ingreso"
                    value={formData.fecha_ingreso}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Fecha de vencimiento (opcional)</label>
                  <input
                    type="date"
                    name="fecha_vencimiento"
                    value={formData.fecha_vencimiento}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {isPending ? "Guardando..." : "Agregar"}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default AgregarProducto;
