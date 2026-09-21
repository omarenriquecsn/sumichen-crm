import React from "react";
import { MessageSquare, MapPin, Users, UserPlus, XCircle, MessageCircle } from "lucide-react";
import { Lead } from "../../types";

type LeadSinConversacionTarjetaProps = {
  lead: Lead;
  onAbrir: (leadId: string) => void;
  onRegistrar: (lead: Lead) => void;
  onPerder: (lead: Lead) => void;
};

export const LeadSinConversacionTarjeta: React.FC<LeadSinConversacionTarjetaProps> = ({
  lead,
  onAbrir,
  onRegistrar,
  onPerder,
}) => {
  const pendientes = Array.isArray(lead.metadata?.mensajes_pendientes)
    ? (lead.metadata.mensajes_pendientes as string[]).length
    : 0;
  const deshabilitado = lead.estado === "convertido" || lead.estado === "perdido";

  return (
    <div className="bg-white rounded-xl border border-dashed border-gray-300 p-4 space-y-3 overflow-hidden">
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-11 h-11 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white font-semibold shrink-0">
          {lead.datos_contacto?.nombre?.charAt(0).toUpperCase() || "?"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="font-medium text-gray-900 truncate">
              {lead.datos_contacto?.nombre || "Sin nombre"}
            </span>
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800 shrink-0">
              Sin chat
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {pendientes > 0 ? `${pendientes} msjs pendientes` : "Sin chat abierto"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
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
          <span className="flex items-center gap-1 min-w-0">
            <Users className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {lead.vendedor_asignado.nombre} {lead.vendedor_asignado.apellido}
            </span>
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap border-t border-gray-100 pt-3">
        <button
          onClick={() => onAbrir(lead.id)}
          className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          title="Iniciar chat"
        >
          <MessageCircle className="h-4 w-4" />
          Iniciar chat
        </button>
        <button
          onClick={() => onRegistrar(lead)}
          disabled={deshabilitado}
          className="inline-flex items-center gap-1 text-green-600 hover:text-green-800 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          title="Registrar como cliente"
        >
          <UserPlus className="h-4 w-4" />
          Cliente
        </button>
        <button
          onClick={() => onPerder(lead)}
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
