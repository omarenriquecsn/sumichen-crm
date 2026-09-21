import React from "react";
import { NavLink } from "react-router-dom";
import { MessageSquare, Clock, MapPin, Users, UserPlus, XCircle } from "lucide-react";
import { Conversacion, Lead } from "../../types";

const estadoColors: Record<string, string> = {
  abierta: "bg-green-100 text-green-800",
  cerrada: "bg-gray-100 text-gray-700",
  transferida: "bg-orange-100 text-orange-800",
};

const formatearHora = (fecha: string | null | undefined) =>
  fecha
    ? new Date(fecha).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" })
    : "";

type ConversacionTarjetaProps = {
  conv: Conversacion;
  esAdmin?: boolean;
  onRegistrar: (lead: Lead) => void;
  onPerder: (lead: Lead) => void;
};

export const ConversacionTarjeta: React.FC<ConversacionTarjetaProps> = ({
  conv,
  esAdmin = false,
  onRegistrar,
  onPerder,
}) => {
  const ultimoMensaje = React.useMemo(() => {
    if (!conv.mensajes || conv.mensajes.length === 0) return null;
    return [...conv.mensajes]
      .sort((a, b) => new Date(a.fecha_creacion).getTime() - new Date(b.fecha_creacion).getTime())
      .pop();
  }, [conv.mensajes]);

  const preview = ultimoMensaje
    ? `${ultimoMensaje.remitente_tipo === "vendedor" ? "Tú: " : ""}${ultimoMensaje.contenido}`
    : "Sin mensajes aún";

  const lead = conv.lead;
  const deshabilitado = lead?.estado === "convertido" || lead?.estado === "perdido";

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 overflow-hidden">
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold shrink-0">
          {lead?.datos_contacto?.nombre?.charAt(0).toUpperCase() || "?"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="font-medium text-gray-900 truncate">
              {lead?.datos_contacto?.nombre || "Sin nombre"}
            </span>
            {conv.ultimo_mensaje_en && (
              <span className="text-xs text-gray-400 shrink-0 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatearHora(conv.ultimo_mensaje_en)}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 line-clamp-2 break-words mt-0.5">{preview}</p>
        </div>
        <span
          className={`px-2 py-0.5 text-xs font-medium rounded-full shrink-0 ${
            estadoColors[conv.estado] || "bg-gray-100 text-gray-700"
          }`}
        >
          {conv.estado}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <MessageSquare className="h-3 w-3" />
          {conv.canal}
        </span>
        {lead?.zona && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {lead.zona.nombre}
          </span>
        )}
        {esAdmin && lead?.vendedor_asignado && (
          <span className="flex items-center gap-1 min-w-0">
            <Users className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {lead.vendedor_asignado.nombre} {lead.vendedor_asignado.apellido}
            </span>
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap border-t border-gray-100 pt-3">
        <NavLink
          to={`/chat/${conv.id}`}
          className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <MessageSquare className="h-4 w-4" />
          Abrir chat
        </NavLink>
        <button
          onClick={() => lead && onRegistrar(lead)}
          disabled={deshabilitado}
          className="inline-flex items-center gap-1 text-green-600 hover:text-green-800 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          title="Registrar como cliente"
        >
          <UserPlus className="h-4 w-4" />
          Cliente
        </button>
        <button
          onClick={() => lead && onPerder(lead)}
          disabled={deshabilitado}
          className="inline-flex items-center gap-1 text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed ml-auto"
          title="Marcar como perdido"
        >
          <XCircle className="h-4 w-4" />
          Perder
        </button>
      </div>
    </div>
  );
};
