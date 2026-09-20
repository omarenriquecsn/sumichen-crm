import { useState } from "react";
import { Producto } from "../../types";
import { useSupabase } from "../../hooks/useSupabase";
import Modal from "../../components/ui/Modal";
import AjusteInventarioModal from "../../components/forms/AjusteInventarioModal";
import { LayoutGrid, List, Package, SlidersHorizontal } from "lucide-react";
import { toast } from "react-toastify";

const estaVencido = (fecha?: string | null) =>
  !!fecha && new Date(fecha).getTime() < Date.now();

const porVencer = (fecha?: string | null) => {
  if (!fecha) return false;
  const diff = new Date(fecha).getTime() - Date.now();
  return diff >= 0 && diff <= 1000 * 60 * 60 * 24 * 30;
};

const ProductosLogistica = () => {
  const supabase = useSupabase();
  const { data: productos, isLoading } = supabase.useStockProductos();
  const { data: lotes } = supabase.useLotes({});

  const [vista, setVista] = useState<"lista" | "tarjetas">("lista");
  const [busqueda, setBusqueda] = useState("");
  const [productoSeleccionado, setProductoSeleccionado] =
    useState<Producto | null>(null);
  const [modalAjusteVisible, setModalAjusteVisible] = useState(false);
  const [vencimientos, setVencimientos] = useState<Record<string, string>>({});

  const { mutate: actualizarVencimiento } =
    supabase.useActualizarVencimientoLote();

  const lista = (productos ?? []).filter((p) =>
    `${p.nombre} ${p.descripcion}`
      .toLowerCase()
      .includes(busqueda.toLowerCase()),
  );

  const lotesDe = (productoId: string) =>
    (lotes ?? []).filter((l) => l.producto_id === productoId);

  const guardarVencimiento = (loteId: string) => {
    const valor = vencimientos[loteId];
    actualizarVencimiento(
      { loteId, fecha_vencimiento: valor ? valor : null },
      {
        onSuccess: () => toast.success("Vencimiento actualizado."),
        onError: (e: unknown) =>
          toast.error(e instanceof Error ? e.message : "Error al actualizar"),
      },
    );
  };

  if (isLoading) return <div className="p-6">Cargando inventario...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar producto..."
          className="w-full sm:w-80 border px-3 py-2 rounded"
        />
        <div className="flex rounded-lg border overflow-hidden">
          <button
            onClick={() => setVista("lista")}
            className={`px-3 py-2 flex items-center gap-1 ${
              vista === "lista" ? "bg-blue-600 text-white" : "bg-white text-gray-700"
            }`}
          >
            <List className="h-4 w-4" /> Lista
          </button>
          <button
            onClick={() => setVista("tarjetas")}
            className={`px-3 py-2 flex items-center gap-1 ${
              vista === "tarjetas"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700"
            }`}
          >
            <LayoutGrid className="h-4 w-4" /> Tarjetas
          </button>
        </div>
      </div>

      {vista === "lista" ? (
        <div className="overflow-x-auto bg-white rounded-xl border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-2 text-left">Código</th>
                <th className="px-4 py-2 text-left">Producto</th>
                <th className="px-4 py-2 text-right">GLOBALCA</th>
                <th className="px-4 py-2 text-right">WMS</th>
                <th className="px-4 py-2 text-right">Total</th>
                <th className="px-4 py-2 text-center">Lotes</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => (
                <tr
                  key={p.id}
                  className="border-t hover:bg-gray-50 cursor-pointer"
                  onClick={() => setProductoSeleccionado(p)}
                >
                  <td className="px-4 py-2 text-gray-700">{p.descripcion}</td>
                  <td className="px-4 py-2 text-gray-900">{p.nombre}</td>
                  <td className="px-4 py-2 text-right">
                    {Number(p.stock?.globalca ?? 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {Number(p.stock?.wms ?? 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right font-medium">
                    {Number(p.stock?.total ?? 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-center text-gray-500">
                    {lotesDe(p.id).length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {lista.map((p) => (
            <button
              key={p.id}
              onClick={() => setProductoSeleccionado(p)}
              className="text-left bg-white rounded-xl border p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-2 text-gray-800">
                <Package className="h-4 w-4 text-blue-600" />
                <span className="font-semibold truncate">{p.nombre}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{p.descripcion}</p>
              <p className="text-sm mt-2 text-gray-700">
                Total: <strong>{Number(p.stock?.total ?? 0).toFixed(2)}</strong>
              </p>
              <p className="text-xs text-gray-500">
                GLOBALCA {Number(p.stock?.globalca ?? 0).toFixed(2)} · WMS{" "}
                {Number(p.stock?.wms ?? 0).toFixed(2)}
              </p>
            </button>
          ))}
        </div>
      )}

      <Modal
        isOpen={!!productoSeleccionado}
        onClose={() => setProductoSeleccionado(null)}
        title={productoSeleccionado ? `Lotes de ${productoSeleccionado.nombre}` : ""}
      >
        {productoSeleccionado && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => setModalAjusteVisible(true)}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                <SlidersHorizontal className="h-4 w-4" /> Ajuste manual
              </button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {lotesDe(productoSeleccionado.id).length === 0 && (
                <p className="text-sm text-gray-500">Sin lotes registrados.</p>
              )}
              {lotesDe(productoSeleccionado.id).map((l) => (
                <div key={l.id} className="border rounded-lg p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-gray-800">
                        {l.codigo_lote} · {l.almacen.toUpperCase()}
                      </p>
                      <p className="text-xs text-gray-500">
                        Ingreso: {l.fecha_ingreso} · Saldo:{" "}
                        {Number(l.cantidad_actual).toFixed(2)} kg
                      </p>
                    </div>
                    {l.fecha_vencimiento && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          estaVencido(l.fecha_vencimiento)
                            ? "bg-red-100 text-red-700"
                            : porVencer(l.fecha_vencimiento)
                              ? "bg-amber-100 text-amber-700"
                              : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        Vence: {l.fecha_vencimiento}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="date"
                      value={vencimientos[l.id] ?? l.fecha_vencimiento ?? ""}
                      onChange={(e) =>
                        setVencimientos((prev) => ({
                          ...prev,
                          [l.id]: e.target.value,
                        }))
                      }
                      className="border rounded px-2 py-1 text-sm"
                    />
                    <button
                      onClick={() => guardarVencimiento(l.id)}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Guardar vencimiento
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {productoSeleccionado && (
        <AjusteInventarioModal
          productoId={productoSeleccionado.id}
          lotes={lotesDe(productoSeleccionado.id)}
          isOpen={modalAjusteVisible}
          onClose={() => setModalAjusteVisible(false)}
        />
      )}
    </div>
  );
};

export default ProductosLogistica;
