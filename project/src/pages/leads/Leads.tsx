import React from "react";
import { Layout } from "../../components/layout/Layout";
import { useAuth } from "../../context/useAuth";
import { useSupabase } from "../../hooks/useSupabase";
import useVendedores from "../../hooks/useVendedores";
import { toast } from "react-toastify";
import { Users, MapPin, AlertCircle, CheckCircle, X, RotateCcw, ArrowRight, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Lead, Zona, Vendedor } from "../../types";
import ConvertirLeadModal from "../../components/forms/ConvertirLeadModal";

const estadoColors: Record<string, string> = {
  nuevo: "bg-gray-100 text-gray-800",
  asignado: "bg-blue-100 text-blue-800",
  contactado: "bg-yellow-100 text-yellow-800",
  calificado: "bg-purple-100 text-purple-800",
  convertido: "bg-green-100 text-green-800",
  perdido: "bg-red-100 text-red-800",
  reasignado: "bg-orange-100 text-orange-800",
};

const origenLabels: Record<string, string> = {
  instagram: "Instagram",
  web: "Web",
  whatsapp: "WhatsApp",
};

const tipoWebLabels: Record<string, string> = {
  cotizacion: "Cotización",
  informacion: "Información",
  soporte: "Soporte",
};

const Leads: React.FC = () => {
  const { userData } = useAuth();
  const { useLeads, useAsignarLead, useReasignarLead, usePerderLead, useZonas } = useSupabase();
  const { data: vendedores } = useVendedores();
  const { data: zonas } = useZonas();
  const [page, setPage] = React.useState(1);
  const [filtros, setFiltros] = React.useState({
    estado: "",
    origen: "",
    zona_id: "",
    search: "",
  });
  const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null);
  const [reasignandoLead, setReasignandoLead] = React.useState<string | null>(null);
  const [convertirLeadSel, setConvertirLeadSel] = React.useState<Lead | null>(null);
  const [nuevoVendedorId, setNuevoVendedorId] = React.useState("");
  const [motivoReasignacion, setMotivoReasignacion] = React.useState("");
  const [zonaParaLead, setZonaParaLead] = React.useState<Record<string, string>>({});

  const { data, isLoading, refetch } = useLeads(undefined, {
    estado: filtros.estado || undefined,
    origen: filtros.origen || undefined,
    zona_id: filtros.zona_id || undefined,
    page,
    limit: 10,
  });
  const asignarLead = useAsignarLead();
  const reasignarLead = useReasignarLead();
  const perderLead = usePerderLead();

  const handleFiltroChange = (key: string, value: string) => {
    setFiltros((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const handleAsignar = (leadId: string, zonaId: string) => {
    if (!zonaId) {
      toast.error("Selecciona una zona");
      return;
    }
    asignarLead.mutate(
      { leadId, zonaId },
      {
        onSuccess: () => {
          toast.success("Lead asignado automáticamente");
          setZonaParaLead((prev) => ({ ...prev, [leadId]: "" }));
          refetch();
        },
        onError: (err) => toast.error(err.message || "Error al asignar"),
      }
    );
  };

  const handleReasignar = (leadId: string) => {
    if (!nuevoVendedorId) {
      toast.error("Selecciona un vendedor");
      return;
    }
    if (!motivoReasignacion) {
      toast.error("Selecciona un motivo");
      return;
    }
    reasignarLead.mutate(
      { leadId, vendedorId: nuevoVendedorId, motivo: motivoReasignacion },
      {
        onSuccess: () => {
          toast.success("Lead reasignado");
          setReasignandoLead(null);
          setNuevoVendedorId("");
          setMotivoReasignacion("");
          refetch();
        },
        onError: (err) => toast.error(err.message || "Error al reasignar"),
      }
    );
  };

  const handleConvertir = (lead: Lead) => {
    setConvertirLeadSel(lead);
  };

  const handlePerder = (leadId: string) => {
    if (confirm("¿Marcar este lead como perdido?")) {
      perderLead.mutate(leadId, {
        onSuccess: () => {
          toast.success("Lead marcado como perdido");
          refetch();
        },
        onError: (err) => toast.error(err.message || "Error al marcar como perdido"),
      });
    }
  };

  const openReasignar = (lead: Lead) => {
    setSelectedLead(lead);
    setReasignandoLead(lead.id);
  };

  if (isLoading) return <Layout title="Mis Leads" subtitle="Leads asignados y pendientes"><div className="flex items-center justify-center py-12">Cargando...</div></Layout>;

  return (
    <Layout title={userData?.rol === 'admin' ? "Todos los Leads" : "Mis Leads"} subtitle="Gestión de leads entrantes">
      <div className="bg-white rounded-xl shadow-lg p-6">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Buscar por nombre, teléfono, email..."
                value={filtros.search}
                onChange={(e) => handleFiltroChange("search", e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </form>
          <div className="flex flex-wrap gap-2">
            <select
              value={filtros.estado}
              onChange={(e) => handleFiltroChange("estado", e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los estados</option>
              <option value="nuevo">Nuevo</option>
              <option value="asignado">Asignado</option>
              <option value="contactado">Contactado</option>
              <option value="calificado">Calificado</option>
              <option value="convertido">Convertido</option>
              <option value="perdido">Perdido</option>
              <option value="reasignado">Reasignado</option>
            </select>
            <select
              value={filtros.origen}
              onChange={(e) => handleFiltroChange("origen", e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los orígenes</option>
              <option value="instagram">Instagram</option>
              <option value="web">Web</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
            <select
              value={filtros.zona_id}
              onChange={(e) => handleFiltroChange("zona_id", e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas las zonas</option>
              {zonas?.map((z: Zona) => (
                <option key={z.id} value={z.id}>
                  {z.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{data?.total || 0}</div>
            <div className="text-sm text-blue-700">Total Leads</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">
              {data?.data?.filter((l) => l.estado === 'asignado' || l.estado === 'contactado').length || 0}
            </div>
            <div className="text-sm text-yellow-700">En gestión</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {data?.data?.filter((l) => l.estado === 'convertido').length || 0}
            </div>
            <div className="text-sm text-green-700">Convertidos</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {data?.data?.filter((l) => l.estado === 'nuevo').length || 0}
            </div>
            <div className="text-sm text-red-700">Sin asignar</div>
          </div>
        </div>

        {/* Lista de leads (móvil/tablet: tarjetas) */}
        <div className="grid grid-cols-1 gap-3 lg:hidden">
          {data?.data?.map((lead) => (
            <div
              key={lead.id}
              className="bg-white rounded-xl border border-gray-200 p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold shrink-0">
                    {lead.datos_contacto?.nombre?.charAt(0).toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {lead.datos_contacto?.nombre || "Sin nombre"}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {lead.datos_contacto?.telefono || "Sin teléfono"}
                    </p>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium shrink-0 ${
                    estadoColors[lead.estado] || "bg-gray-100 text-gray-800"
                  }`}
                >
                  {lead.estado === 'nuevo' && <AlertCircle className="h-3 w-3 mr-1" />}
                  {lead.estado === 'asignado' && <Users className="h-3 w-3 mr-1" />}
                  {lead.estado === 'contactado' && <RotateCcw className="h-3 w-3 mr-1" />}
                  {lead.estado === 'calificado' && <CheckCircle className="h-3 w-3 mr-1" />}
                  {lead.estado === 'convertido' && <CheckCircle className="h-3 w-3 mr-1 text-green-600" />}
                  {lead.estado === 'perdido' && <X className="h-3 w-3 mr-1" />}
                  {lead.estado === 'reasignado' && <RotateCcw className="h-3 w-3 mr-1" />}
                  {lead.estado.charAt(0).toUpperCase() + lead.estado.slice(1)}
                </span>
              </div>

              {lead.datos_contacto?.email && (
                <p className="text-sm text-gray-500 truncate">
                  {lead.datos_contacto.email}
                </p>
              )}
              {lead.datos_contacto?.mensaje_inicial && (
                <p className="text-sm text-gray-500 line-clamp-2">
                  {lead.datos_contacto.mensaje_inicial}
                </p>
              )}

              <div className="flex flex-wrap gap-1.5 text-xs">
                <span className="inline-flex items-center px-2 py-1 rounded font-medium bg-purple-100 text-purple-800">
                  {origenLabels[lead.origen] || lead.origen}
                </span>
                {lead.tipo_web && (
                  <span className="inline-flex items-center px-2 py-1 rounded font-medium bg-gray-100 text-gray-700">
                    {tipoWebLabels[lead.tipo_web] || lead.tipo_web}
                  </span>
                )}
                {lead.zona?.nombre && (
                  <span className="inline-flex items-center px-2 py-1 rounded font-medium bg-green-100 text-green-800">
                    <MapPin className="h-3 w-3 mr-1" /> {lead.zona.nombre}
                  </span>
                )}
                {lead.vendedor_asignado && (
                  <span className="inline-flex items-center px-2 py-1 rounded font-medium bg-blue-100 text-blue-800">
                    <Users className="h-3 w-3 mr-1" /> {lead.vendedor_asignado.nombre} {lead.vendedor_asignado.apellido}
                  </span>
                )}
              </div>

              <p className="text-xs text-gray-400">
                Creado:{" "}
                {new Date(lead.fecha_creacion).toLocaleDateString("es-VE", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>

              <div className="flex items-center gap-2 flex-wrap border-t border-gray-100 pt-3">
                {lead.estado === 'nuevo' && (
                  <div className="w-full flex items-center gap-2">
                    <select
                      value={zonaParaLead[lead.id] || ""}
                      onChange={(e) =>
                        setZonaParaLead((prev) => ({
                          ...prev,
                          [lead.id]: e.target.value,
                        }))
                      }
                      className="flex-1 min-w-[140px] border border-gray-300 rounded px-2 py-1.5 text-sm"
                    >
                      <option value="">Zona...</option>
                      {zonas?.map((z: Zona) => (
                        <option key={z.id} value={z.id}>
                          {z.nombre}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() =>
                        handleAsignar(lead.id, zonaParaLead[lead.id] || "")
                      }
                      disabled={asignarLead.isPending || !zonaParaLead[lead.id]}
                      className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      <ArrowRight className="h-3 w-3" /> Asignar
                    </button>
                  </div>
                )}
                {['asignado', 'contactado', 'calificado', 'reasignado'].includes(lead.estado) && lead.vendedor_asignado_id && (
                  <button
                    onClick={() => openReasignar(lead)}
                    className="flex items-center gap-1 text-orange-600 hover:text-orange-800 text-xs font-medium"
                  >
                    <RotateCcw className="h-3 w-3" /> Reasignar
                  </button>
                )}
                {['asignado', 'contactado', 'calificado', 'reasignado'].includes(lead.estado) && lead.vendedor_asignado_id && (
                  <button
                    onClick={() => handleConvertir(lead)}
                    className="flex items-center gap-1 text-green-600 hover:text-green-800 text-xs font-medium"
                  >
                    <CheckCircle className="h-3 w-3" /> Convertir
                  </button>
                )}
                {lead.estado !== 'convertido' && lead.estado !== 'perdido' && (
                  <button
                    onClick={() => handlePerder(lead.id)}
                    disabled={perderLead.isPending}
                    className="flex items-center gap-1 text-red-600 hover:text-red-800 text-xs font-medium ml-auto"
                  >
                    <X className="h-3 w-3" /> Perder
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Tabla (desktop) */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lead</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Origen / Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zona</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendedor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Creado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data?.data?.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{lead.datos_contacto?.nombre}</div>
                    <div className="text-sm text-gray-500">
                      {lead.datos_contacto?.telefono} • {lead.datos_contacto?.email || "—"}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{lead.datos_contacto?.mensaje_inicial?.slice(0, 50)}...</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                      {origenLabels[lead.origen] || lead.origen}
                    </span>
                    {lead.tipo_web && (
                      <span className="ml-1 inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                        {tipoWebLabels[lead.tipo_web] || lead.tipo_web}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {lead.zona?.nombre ? (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                        <MapPin className="h-3 w-3 mr-1" /> {lead.zona.nombre}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">Sin zona</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${estadoColors[lead.estado] || "bg-gray-100 text-gray-800"}`}>
                      {lead.estado === 'nuevo' && <AlertCircle className="h-3 w-3 mr-1" />}
                      {lead.estado === 'asignado' && <Users className="h-3 w-3 mr-1" />}
                      {lead.estado === 'contactado' && <RotateCcw className="h-3 w-3 mr-1" />}
                      {lead.estado === 'calificado' && <CheckCircle className="h-3 w-3 mr-1" />}
                      {lead.estado === 'convertido' && <CheckCircle className="h-3 w-3 mr-1 text-green-600" />}
                      {lead.estado === 'perdido' && <X className="h-3 w-3 mr-1" />}
                      {lead.estado === 'reasignado' && <RotateCcw className="h-3 w-3 mr-1" />}
                      {lead.estado.charAt(0).toUpperCase() + lead.estado.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {lead.vendedor_asignado ? (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-xs font-medium">
                          {lead.vendedor_asignado.nombre?.charAt(0)}{lead.vendedor_asignado.apellido?.charAt(0)}
                        </div>
                        <span className="text-sm text-gray-700">{lead.vendedor_asignado.nombre} {lead.vendedor_asignado.apellido}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">Sin asignar</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(lead.fecha_creacion).toLocaleDateString("es-VE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {lead.estado === 'nuevo' && (
                        <>
                          <select
                            value={zonaParaLead[lead.id] || ""}
                            onChange={(e) => setZonaParaLead((prev) => ({ ...prev, [lead.id]: e.target.value }))}
                            className="border border-gray-300 rounded px-2 py-1 text-xs"
                          >
                            <option value="">Zona...</option>
                            {zonas?.map((z: Zona) => (
                              <option key={z.id} value={z.id}>
                                {z.nombre}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleAsignar(lead.id, zonaParaLead[lead.id] || "")}
                            disabled={asignarLead.isPending || !zonaParaLead[lead.id]}
                            className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                          >
                            <ArrowRight className="h-3 w-3" /> Asignar
                          </button>
                        </>
                      )}
                      {['asignado', 'contactado', 'calificado', 'reasignado'].includes(lead.estado) && lead.vendedor_asignado_id && (
                        <button
                          onClick={() => openReasignar(lead)}
                          className="text-orange-600 hover:text-orange-800 text-xs font-medium"
                        >
                          <RotateCcw className="h-3 w-3 inline mr-1" /> Reasignar
                        </button>
                      )}
                      {['asignado', 'contactado', 'calificado', 'reasignado'].includes(lead.estado) && lead.vendedor_asignado_id && (
                        <button
                          onClick={() => handleConvertir(lead)}
                          className="text-green-600 hover:text-green-800 text-xs font-medium"
                        >
                          <CheckCircle className="h-3 w-3 inline mr-1" /> Convertir
                        </button>
                      )}
                      {lead.estado !== 'convertido' && lead.estado !== 'perdido' && (
                        <button
                          onClick={() => handlePerder(lead.id)}
                          disabled={perderLead.isPending}
                          className="text-red-600 hover:text-red-800 text-xs font-medium"
                        >
                          <X className="h-3 w-3 inline mr-1" /> Perder
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-4 text-sm text-gray-700">
              Página {page} de {data.totalPages} ({data.total} leads)
            </span>
            <button
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Modal Reasignar */}
        {reasignandoLead && selectedLead && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Reasignar Lead</h2>
              <p className="text-gray-600 mb-4">Lead: {selectedLead.datos_contacto?.nombre} ({selectedLead.estado})</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nuevo vendedor</label>
                  <select
                    value={nuevoVendedorId}
                    onChange={(e) => setNuevoVendedorId(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar...</option>
                    {vendedores?.map((v: Vendedor) => (
                      <option key={v.id} value={v.id}>
                        {v.nombre} {v.apellido}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
                  <select
                    value={motivoReasignacion}
                    onChange={(e) => setMotivoReasignacion(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="sla_vencido">SLA vencido (12h sin respuesta)</option>
                    <option value="manual_admin">Reasignación manual</option>
                    <option value="vendedor_inactivo">Vendedor inactivo</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={() => {
                      setReasignandoLead(null);
                      setNuevoVendedorId("");
                      setMotivoReasignacion("");
                    }}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleReasignar(reasignandoLead)}
                    disabled={reasignarLead.isPending}
                    className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
                  >
                    {reasignarLead.isPending ? "Reasignando..." : "Reasignar"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Modal Convertir a Cliente */}
        <ConvertirLeadModal
          key={convertirLeadSel?.id || "none"}
          lead={convertirLeadSel}
          onClose={() => setConvertirLeadSel(null)}
          onConverted={() => {
            setConvertirLeadSel(null);
            refetch();
          }}
        />
      </div>
    </Layout>
  );
};

export default Leads;