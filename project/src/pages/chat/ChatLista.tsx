import React from "react";
import { Layout } from "../../components/layout/Layout";
import { useAuth } from "../../context/useAuth";
import { useSupabase } from "../../hooks/useSupabase";
import { NavLink, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { MessageSquare, Clock, Check, Search, MapPin, Users, MessageCircle, UserPlus, XCircle } from "lucide-react";
import { Conversacion, Lead } from "../../types";
import ConvertirLeadModal from "../../components/forms/ConvertirLeadModal";

const estadoColors: Record<string, string> = {
  abierta: "bg-green-100 text-green-800",
  cerrada: "bg-gray-100 text-gray-700",
  transferida: "bg-orange-100 text-orange-800",
};

const formatearHora = (fecha: string | null | undefined) =>
  fecha
    ? new Date(fecha).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" })
    : "";

const ConversacionItem: React.FC<{ conv: Conversacion; onRegistrar: (lead: Lead) => void; onPerder: (lead: Lead) => void }> = ({ conv, onRegistrar, onPerder }) => {
  const ultimoMensaje = React.useMemo(() => {
    if (!conv.mensajes || conv.mensajes.length === 0) return null;
    return [...conv.mensajes]
      .sort((a, b) => new Date(a.fecha_creacion).getTime() - new Date(b.fecha_creacion).getTime())
      .pop();
  }, [conv.mensajes]);

  const preview = ultimoMensaje
    ? `${ultimoMensaje.remitente_tipo === "vendedor" ? "Tú: " : ""}${ultimoMensaje.contenido}`
    : "Sin mensajes aún";

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <NavLink
        to={`/chat/${conv.id}`}
        className={({ isActive }) =>
          `flex-1 flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 sm:py-4 rounded-lg transition-all duration-200 border ${
            isActive
              ? "border-blue-300 bg-blue-50"
              : "border-transparent hover:border-gray-200 hover:bg-gray-50"
          }`
        }
      >
        {({ isActive }) => (
          <>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold shrink-0">
              {conv.lead?.datos_contacto?.nombre?.charAt(0).toUpperCase() || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-gray-900 truncate">
                  {conv.lead?.datos_contacto?.nombre || "Sin nombre"}
                </span>
                {conv.ultimo_mensaje_en && (
                  <span className="text-xs text-gray-400 shrink-0 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatearHora(conv.ultimo_mensaje_en)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5 min-w-0">
                <span className="truncate">{preview}</span>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full shrink-0 ${estadoColors[conv.estado] || "bg-gray-100 text-gray-700"}`}>
                  {conv.estado}
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-3 text-xs text-gray-400 mt-1">
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {conv.canal}
                </span>
                {conv.lead?.zona && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {conv.lead.zona.nombre}
                  </span>
                )}
                {conv.vendedor && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {conv.vendedor.nombre} {conv.vendedor.apellido}
                  </span>
                )}
              </div>
            </div>
            {isActive && <Check className="h-6 w-6 text-blue-600 shrink-0" />}
          </>
        )}
      </NavLink>
      <div className="flex flex-col items-center gap-1 shrink-0 sm:items-start">
        <button
          onClick={() => conv.lead && onRegistrar(conv.lead)}
          disabled={conv.lead?.estado === "convertido" || conv.lead?.estado === "perdido"}
          className="flex items-center gap-1 text-green-600 hover:text-green-800 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          title="Registrar como cliente"
        >
          <UserPlus className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Cliente</span>
        </button>
        <button
          onClick={() => conv.lead && onPerder(conv.lead)}
          disabled={conv.lead?.estado === "convertido" || conv.lead?.estado === "perdido"}
          className="flex items-center gap-1 text-red-600 hover:text-red-800 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          title="Marcar como perdido"
        >
          <XCircle className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Perder</span>
        </button>
      </div>
    </div>
  );
};

const LeadSinConversacion: React.FC<{ lead: Lead; onAbrir: (leadId: string) => void; onRegistrar: (lead: Lead) => void; onPerder: (lead: Lead) => void }> = ({ lead, onAbrir, onRegistrar, onPerder }) => {
  const pendientes = Array.isArray(lead.metadata?.mensajes_pendientes)
    ? (lead.metadata.mensajes_pendientes as string[]).length
    : 0;

  return (
    <div className="flex items-center gap-3 px-3 sm:px-4 py-3 sm:py-4 rounded-lg border border-dashed border-gray-300 hover:bg-gray-50 transition-all">
      <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white font-semibold shrink-0">
        {lead.datos_contacto?.nombre?.charAt(0).toUpperCase() || "?"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-gray-900 truncate">
            {lead.datos_contacto?.nombre || "Sin nombre"}
          </span>
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800 shrink-0">
            Sin chat
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5 min-w-0">
          <span className="truncate">
            {pendientes > 0 ? `${pendientes} msjs pendientes` : "Sin chat abierto"}
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-xs text-gray-400 mt-1">
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            {lead.origen}
          </span>
          {lead.zona && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {lead.zona.nombre}
            </span>
          )}
          {lead.vendedor_asignado && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {lead.vendedor_asignado.nombre} {lead.vendedor_asignado.apellido}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <button
          onClick={() => onRegistrar(lead)}
          disabled={lead.estado === "convertido" || lead.estado === "perdido"}
          className="flex items-center gap-1 text-green-600 hover:text-green-800 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          title="Registrar como cliente"
        >
          <UserPlus className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Cliente</span>
        </button>
        <button
          onClick={() => onPerder(lead)}
          disabled={lead.estado === "convertido" || lead.estado === "perdido"}
          className="flex items-center gap-1 text-red-600 hover:text-red-800 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          title="Marcar como perdido"
        >
          <XCircle className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Perder</span>
        </button>
        <button
          onClick={() => onAbrir(lead.id)}
          className="flex items-center gap-2 bg-blue-600 text-white px-2 sm:px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          title="Iniciar chat"
        >
          <MessageCircle className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Iniciar chat</span>
        </button>
      </div>
    </div>
  );
};

const ChatLista: React.FC = () => {
  const { userData } = useAuth();
  const esAdmin = userData?.rol === "admin";
  const navigate = useNavigate();
  const { useConversaciones, useLeads, useAbrirConversacion, usePerderLead } = useSupabase();
  const { data: conversaciones, isLoading } = useConversaciones(undefined, { estado: "abierta" });
  const { data: leadsResp } = useLeads(undefined, { estado: "asignado", limit: 100 });
  const abrirConversacion = useAbrirConversacion();
  const perderLead = usePerderLead();
  const [search, setSearch] = React.useState("");
  const [convertirLeadSel, setConvertirLeadSel] = React.useState<Lead | null>(null);

  const conversacionesFiltradas = conversaciones?.filter((c) =>
    c.lead?.datos_contacto?.nombre?.toLowerCase().includes(search.toLowerCase()) ||
    c.lead?.datos_contacto?.telefono?.includes(search)
  ) || [];

  // Leads asignados (estado asignado/contactado/reasignado) que NO tienen conversación abierta
  const leadsSinConversacion = React.useMemo(() => {
    const conConv = new Set((conversaciones || []).map((c) => c.lead_id));
    const estadosValidos = ["asignado", "contactado", "reasignado"];
    return (leadsResp?.data || []).filter(
      (l) => estadosValidos.includes(l.estado) && !conConv.has(l.id)
    );
  }, [leadsResp, conversaciones]);

  const handleAbrir = (leadId: string) => {
    abrirConversacion.mutate(
      { leadId, canal: "whatsapp" },
      {
        onSuccess: (conv) => {
          toast.success("Conversación iniciada");
          navigate(`/chat/${conv.id}`);
        },
        onError: (err) => toast.error(err.message || "Error al iniciar conversación"),
      }
    );
  };

  const handleRegistrarCliente = (lead: Lead) => {
    setConvertirLeadSel(lead);
  };

  const handlePerder = (lead: Lead) => {
    if (confirm(`¿Marcar como perdido a "${lead.datos_contacto?.nombre || "este lead"}"?`)) {
      perderLead.mutate(lead.id, {
        onSuccess: () => toast.success("Lead marcado como perdido"),
        onError: (err) => toast.error(err.message || "Error al marcar como perdido"),
      });
    }
  };

  // Admin: agrupar por vendedor. Vendedor: lista simple (el backend ya filtra).
  const gruposPorVendedor = React.useMemo(() => {
    if (!esAdmin) return null;
    const map = new Map<string, { vendedor: string; conversaciones: Conversacion[] }>();
    for (const conv of conversacionesFiltradas) {
      const key = conv.vendedor_id;
      const nombre = conv.vendedor ? `${conv.vendedor.nombre} ${conv.vendedor.apellido}` : "Sin vendedor";
      if (!map.has(key)) {
        map.set(key, { vendedor: nombre, conversaciones: [] });
      }
      map.get(key)!.conversaciones.push(conv);
    }
    return Array.from(map.values()).sort((a, b) => b.conversaciones.length - a.conversaciones.length);
  }, [conversacionesFiltradas, esAdmin]);

  return (
    <Layout title="Chats" subtitle="Conversaciones con leads asignados">
      <div className="bg-white rounded-none sm:rounded-xl shadow-none sm:shadow-lg -m-6 sm:m-0">
        <div className="flex flex-col sm:flex-row gap-4 px-4 pt-4 pb-2 sm:px-6 sm:pt-6 sm:pb-0 mb-2 sm:mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar por nombre o teléfono..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full">{conversacionesFiltradas.length} activos</span>
            {leadsSinConversacion.length > 0 && (
              <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded-full">{leadsSinConversacion.length} sin chat</span>
            )}
          </div>
        </div>

        <div className="px-4 sm:px-6 pb-4 sm:pb-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">Cargando conversaciones...</div>
          ) : (
            <>
              {/* Leads asignados sin conversación abierta */}
              {leadsSinConversacion.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-amber-500" />
                    Leads asignados esperando chat
                  </h3>
                  <div className="space-y-2">
                    {leadsSinConversacion.map((lead) => (
                      <LeadSinConversacion
                        key={lead.id}
                        lead={lead}
                        onAbrir={handleAbrir}
                        onRegistrar={handleRegistrarCliente}
                        onPerder={handlePerder}
                      />
                    ))}
                  </div>
                </div>
              )}

              {conversacionesFiltradas.length === 0 && leadsSinConversacion.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No hay conversaciones</h3>
                  <p className="text-gray-500">Los leads asignados aparecerán aquí cuando inicies una conversación</p>
                </div>
              ) : esAdmin && gruposPorVendedor ? (
                <div className="space-y-6">
                  {gruposPorVendedor.map((grupo) => (
                    <div key={grupo.vendedor}>
                      <div className="flex items-center gap-2 px-2 py-2">
                        <Users className="h-4 w-4 text-blue-600" />
                        <span className="font-semibold text-gray-800">{grupo.vendedor}</span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          {grupo.conversaciones.length}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {grupo.conversaciones.map((conv) => (
                          <ConversacionItem
                            key={conv.id}
                            conv={conv}
                            onRegistrar={handleRegistrarCliente}
                            onPerder={handlePerder}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {conversacionesFiltradas.map((conv) => (
                    <ConversacionItem
                      key={conv.id}
                      conv={conv}
                      onRegistrar={handleRegistrarCliente}
                      onPerder={handlePerder}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal Registrar Cliente */}
      <ConvertirLeadModal
        key={convertirLeadSel?.id || "none"}
        lead={convertirLeadSel}
        onClose={() => setConvertirLeadSel(null)}
        onConverted={() => setConvertirLeadSel(null)}
      />
    </Layout>
  );
};

export default ChatLista;
