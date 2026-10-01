import { useState, type ReactNode } from "react";
import { Layout } from "../../components/layout/Layout";
import { useSupabase } from "../../hooks/useSupabase";
import ProductosLogistica from "./ProductosLogistica";
import InstrumentoMovimientoModal from "../../components/forms/InstrumentoMovimientoModal";
import { MovimientoKardexTarjeta } from "../../components/ui/MovimientoKardexTarjeta";
import { InstrumentoStockTarjeta } from "../../components/ui/InstrumentoStockTarjeta";
import { ClienteInstrumentosTarjeta } from "../../components/ui/ClienteInstrumentosTarjeta";
import { MovimientoInstrumentoTarjeta } from "../../components/ui/MovimientoInstrumentoTarjeta";
import {
  AlertTriangle,
  Boxes,
  CalendarClock,
  ClipboardList,
  Package,
  Truck,
} from "lucide-react";

type Tab = "panel" | "productos" | "kardex" | "instrumentos";

const Logistica = () => {
  const supabase = useSupabase();
  const [tab, setTab] = useState<Tab>("panel");

  // Datos compartidos
  const { data: lotes } = supabase.useLotes({});
  const { data: pedidos } = supabase.usePedidos();
  const { data: stockInstrumentos } = supabase.useStockInstrumentos();
  const { data: instrumentosPorCliente } =
    supabase.useInstrumentosPorCliente();
  const { data: tipos } = supabase.useTiposInstrumento(true);

  // Kardex de productos
  const [kardexProducto, setKardexProducto] = useState("");
  const [busquedaKardex, setBusquedaKardex] = useState("");
  const { data: productos } = supabase.useStockProductos();
  const { data: kardex } = supabase.useKardex({
    producto_id: kardexProducto || undefined,
  });

  // Buscador del kardex (producto, código, lote, tipo, almacén o motivo).
  const kardexFiltrado = (kardex ?? []).filter((m) => {
    const q = busquedaKardex.trim().toLowerCase();
    if (!q) return true;
    return [
      m.producto?.nombre,
      m.producto?.descripcion,
      m.lote?.codigo_lote,
      m.tipo,
      m.almacen,
      m.motivo_categoria,
      m.observacion,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  // Kardex de instrumentos
  const { data: kardexInstrumentos } = supabase.useInstrumentosKardex();

  // Modales de instrumentos
  const [modalMov, setModalMov] = useState<null | "entrada" | "baja" | "ajuste">(
    null,
  );

  const hoy = Date.now();
  const vencidos = (lotes ?? []).filter(
    (l) =>
      l.fecha_vencimiento && new Date(l.fecha_vencimiento).getTime() < hoy,
  );
  const porVencer = (lotes ?? []).filter((l) => {
    if (!l.fecha_vencimiento) return false;
    const diff = new Date(l.fecha_vencimiento).getTime() - hoy;
    return diff >= 0 && diff <= 1000 * 60 * 60 * 24 * 30;
  });
  const pedidosPendientes = (pedidos ?? []).filter(
    (p) => p.estado === "pendiente",
  );
  const totTransito = (instrumentosPorCliente ?? []).reduce(
    (a, c) => a + Number(c.en_transito),
    0,
  );
  const totCliente = (instrumentosPorCliente ?? []).reduce(
    (a, c) => a + Number(c.en_cliente),
    0,
  );

  const tabs: { id: Tab; label: string; icon: ReactNode }[] = [
    { id: "panel", label: "Panel", icon: <ClipboardList className="h-4 w-4" /> },
    { id: "productos", label: "Productos", icon: <Package className="h-4 w-4" /> },
    { id: "kardex", label: "Kardex", icon: <Boxes className="h-4 w-4" /> },
    {
      id: "instrumentos",
      label: "Instrumentos",
      icon: <Truck className="h-4 w-4" />,
    },
  ];

  return (
    <Layout
      title="Logística"
      subtitle="Inventario, vencimientos, kardex e instrumentos retornables"
    >
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${
              tab === t.id
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-700"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === "panel" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border p-4">
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" /> Lotes vencidos
              </p>
              <p className="text-2xl font-bold text-red-600">
                {vencidos.length}
              </p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-amber-500" /> Por vencer
                (30 días)
              </p>
              <p className="text-2xl font-bold text-amber-600">
                {porVencer.length}
              </p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <Truck className="h-4 w-4 text-blue-500" /> Pedidos en tránsito
              </p>
              <p className="text-2xl font-bold text-blue-600">
                {pedidosPendientes.length}
              </p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <Boxes className="h-4 w-4 text-emerald-500" /> Instrumentos
              </p>
              <p className="text-sm text-gray-700">
                En cliente: <strong>{totCliente}</strong>
              </p>
              <p className="text-sm text-gray-700">
                En tránsito: <strong>{totTransito}</strong>
              </p>
            </div>
          </div>

          {vencidos.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <h4 className="font-semibold text-red-800 mb-2">
                Lotes vencidos
              </h4>
              <ul className="text-sm text-red-700 space-y-1">
                {vencidos.slice(0, 10).map((l) => (
                  <li key={l.id}>
                    {l.producto?.nombre ?? l.codigo_lote} · {l.codigo_lote} ·{" "}
                    {l.almacen.toUpperCase()} · {l.fecha_vencimiento}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {porVencer.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <h4 className="font-semibold text-amber-800 mb-2">
                Lotes por vencer (30 días)
              </h4>
              <ul className="text-sm text-amber-700 space-y-1">
                {porVencer.slice(0, 10).map((l) => (
                  <li key={l.id}>
                    {l.producto?.nombre ?? l.codigo_lote} · {l.codigo_lote} ·{" "}
                    {l.almacen.toUpperCase()} · {l.fecha_vencimiento}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {tab === "productos" && <ProductosLogistica />}

      {tab === "kardex" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={busquedaKardex}
              onChange={(e) => setBusquedaKardex(e.target.value)}
              placeholder="Buscar (producto, lote, tipo, motivo)..."
              className="w-full sm:w-96 border px-3 py-2 rounded"
            />
            <select
              value={kardexProducto}
              onChange={(e) => setKardexProducto(e.target.value)}
              className="w-full sm:w-96 border px-3 py-2 rounded bg-white"
            >
              <option value="">Todos los productos</option>
              {(productos ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} ({p.descripcion})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:hidden">
            {kardexFiltrado.map((m) => (
              <MovimientoKardexTarjeta key={m.id} movimiento={m} />
            ))}
            {kardexFiltrado.length === 0 && (
              <p className="text-center text-gray-500 py-6 bg-white rounded-xl border">
                Sin movimientos.
              </p>
            )}
          </div>

          <div className="hidden lg:block overflow-x-auto bg-white rounded-xl border">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-2 text-left">Fecha</th>
                  <th className="px-4 py-2 text-left">Tipo</th>
                  <th className="px-4 py-2 text-left">Producto</th>
                  <th className="px-4 py-2 text-left">Lote</th>
                  <th className="px-4 py-2 text-left">Almacén</th>
                  <th className="px-4 py-2 text-right">Cantidad</th>
                  <th className="px-4 py-2 text-right">Saldo</th>
                  <th className="px-4 py-2 text-left">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {kardexFiltrado.map((m) => (
                  <tr key={m.id} className="border-t">
                    <td className="px-4 py-2 text-gray-600">
                      {new Date(m.fecha_creacion).toLocaleString("es-VE")}
                    </td>
                    <td className="px-4 py-2 capitalize">{m.tipo}</td>
                    <td className="px-4 py-2">
                      {m.producto?.nombre ?? m.producto_id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-2">{m.lote?.codigo_lote ?? "-"}</td>
                    <td className="px-4 py-2 uppercase">
                      {m.almacen ?? "-"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {Number(m.cantidad).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {Number(m.saldo_resultante).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-gray-500">
                      {m.motivo_categoria ?? m.observacion ?? "-"}
                    </td>
                  </tr>
                ))}
                {kardexFiltrado.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-gray-500">
                      Sin movimientos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "instrumentos" && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setModalMov("entrada")}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Entrada / reposición
            </button>
            <button
              onClick={() => setModalMov("baja")}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
            >
              Baja (donación/daño)
            </button>
            <button
              onClick={() => setModalMov("ajuste")}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Ajuste
            </button>
          </div>

          <section>
            <h4 className="font-semibold text-gray-800 mb-2">
              Existencias por instrumento y almacén
            </h4>
            <div className="grid grid-cols-1 gap-3 lg:hidden">
              {(stockInstrumentos ?? []).map((s) => (
                <InstrumentoStockTarjeta
                  key={`${s.tipo_instrumento_id}-${s.almacen}`}
                  stock={s}
                />
              ))}
            </div>

            <div className="hidden lg:block overflow-x-auto bg-white rounded-xl border">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-2 text-left">Instrumento</th>
                    <th className="px-4 py-2 text-left">Almacén</th>
                    <th className="px-4 py-2 text-right">Disponible</th>
                    <th className="px-4 py-2 text-right">Total en circulación</th>
                  </tr>
                </thead>
                <tbody>
                  {(stockInstrumentos ?? []).map((s) => (
                    <tr
                      key={`${s.tipo_instrumento_id}-${s.almacen}`}
                      className="border-t"
                    >
                      <td className="px-4 py-2">{s.nombre}</td>
                      <td className="px-4 py-2 uppercase">{s.almacen}</td>
                      <td className="px-4 py-2 text-right">
                        {Number(s.cantidad_disponible).toFixed(0)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {Number(s.cantidad_total).toFixed(0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h4 className="font-semibold text-gray-800 mb-2">
              Clientes con instrumentos
            </h4>
            <div className="grid grid-cols-1 gap-3 lg:hidden">
              {(instrumentosPorCliente ?? []).map((c) => (
                <ClienteInstrumentosTarjeta key={c.cliente_id} cliente={c} />
              ))}
              {(instrumentosPorCliente ?? []).length === 0 && (
                <p className="text-center text-gray-500 py-6 bg-white rounded-xl border">
                  Ningún cliente tiene instrumentos.
                </p>
              )}
            </div>

            <div className="hidden lg:block overflow-x-auto bg-white rounded-xl border">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-2 text-left">Cliente</th>
                    <th className="px-4 py-2 text-right">En cliente</th>
                    <th className="px-4 py-2 text-right">En tránsito</th>
                    <th className="px-4 py-2 text-left">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {(instrumentosPorCliente ?? []).map((c) => (
                    <tr key={c.cliente_id} className="border-t">
                      <td className="px-4 py-2">{c.cliente_nombre}</td>
                      <td className="px-4 py-2 text-right">
                        {Number(c.en_cliente).toFixed(0)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {Number(c.en_transito).toFixed(0)}
                      </td>
                      <td className="px-4 py-2 text-gray-500">
                        {c.detalle
                          .map(
                            (d) =>
                              `${d.nombre}: ${d.en_cliente} cliente${
                                d.en_transito ? `/${d.en_transito} tránsito` : ""
                              }`,
                          )
                          .join(" · ")}
                      </td>
                    </tr>
                  ))}
                  {(instrumentosPorCliente ?? []).length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-6 text-center text-gray-500"
                      >
                        Ningún cliente tiene instrumentos.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h4 className="font-semibold text-gray-800 mb-2">
              Kardex de instrumentos
            </h4>
            <div className="grid grid-cols-1 gap-3 lg:hidden">
              {(kardexInstrumentos ?? []).map((m) => (
                <MovimientoInstrumentoTarjeta key={m.id} movimiento={m} />
              ))}
              {(kardexInstrumentos ?? []).length === 0 && (
                <p className="text-center text-gray-500 py-6 bg-white rounded-xl border">
                  Sin movimientos.
                </p>
              )}
            </div>

            <div className="hidden lg:block overflow-x-auto bg-white rounded-xl border">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-2 text-left">Fecha</th>
                    <th className="px-4 py-2 text-left">Tipo</th>
                    <th className="px-4 py-2 text-left">Instrumento</th>
                    <th className="px-4 py-2 text-left">Almacén</th>
                    <th className="px-4 py-2 text-right">Cantidad</th>
                    <th className="px-4 py-2 text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {(kardexInstrumentos ?? []).map((m) => (
                    <tr key={m.id} className="border-t">
                      <td className="px-4 py-2 text-gray-600">
                        {new Date(m.fecha_creacion).toLocaleString("es-VE")}
                      </td>
                      <td className="px-4 py-2 capitalize">{m.tipo}</td>
                      <td className="px-4 py-2">
                        {m.tipo_instrumento?.nombre ?? "-"}
                      </td>
                      <td className="px-4 py-2 uppercase">
                        {m.almacen ?? "-"}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {Number(m.cantidad).toFixed(0)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {Number(m.saldo_resultante).toFixed(0)}
                      </td>
                    </tr>
                  ))}
                  {(kardexInstrumentos ?? []).length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-6 text-center text-gray-500"
                      >
                        Sin movimientos.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {modalMov && (
        <InstrumentoMovimientoModal
          tipos={tipos ?? []}
          stock={stockInstrumentos ?? []}
          isOpen={!!modalMov}
          modo={modalMov}
          onClose={() => setModalMov(null)}
        />
      )}
    </Layout>
  );
};

export default Logistica;
