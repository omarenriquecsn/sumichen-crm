import React from "react";
import { X, MessageSquare, AlertCircle, Clock } from "lucide-react";
import { useSupabase } from "../../hooks/useSupabase";
import { Lead, Mensaje } from "../../types";

interface VerMensajesLeadModalProps {
  lead: Lead | null;
  onClose: () => void;
}

const VerMensajesLeadModal: React.FC<VerMensajesLeadModalProps> = ({ lead, onClose }) => {
  const { useConversacionByLead, useMensajes } = useSupabase();
  const { data: conversacion, isLoading: loadingConv } = useConversacionByLead(lead?.id ?? "");
  const { data: mensajes, isLoading: loadingMsg } = useMensajes(conversacion?.id ?? "", 1, 100);

  if (!lead) return null;

  const pendientes: string[] = Array.isArray(lead.metadata?.mensajes_pendientes)
    ? (lead.metadata.mensajes_pendientes as string[])
    : [];

  const nombreLead = lead.datos_contacto?.nombre || "Sin nombre";
  const inicial = nombreLead.charAt(0).toUpperCase();

  const formatearHora = (fecha: string) =>
    new Date(fecha).toLocaleString("es-VE", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  const renderMensaje = (msg: Mensaje) => {
    const esVendedor = msg.remitente_tipo === "vendedor";
    const esSistema = msg.remitente_tipo === "sistema";

    if (esSistema) {
      return (
        <div key={msg.id} className="text-center text-xs text-gray-500 py-2">
          {msg.contenido}
        </div>
      );
    }

    return (
      <div key={msg.id} className={`flex ${esVendedor ? "justify-end" : "justify-start"}`}>
        <div
          className={`max-w-[85%] px-3 py-2 rounded-2xl ${
            esVendedor
              ? "bg-blue-600 text-white rounded-tr-none"
              : "bg-gray-100 text-gray-900 rounded-tl-none"
          }`}
        >
          <div className={`text-xs mb-1 ${esVendedor ? "text-blue-100" : "text-gray-500"}`}>
            {esVendedor ? "Vendedor" : nombreLead}
          </div>
          <div className="whitespace-pre-wrap break-words text-sm">{msg.contenido}</div>
          <div
            className={`flex items-center gap-1 mt-1 text-xs ${
              esVendedor ? "justify-end text-blue-100" : "text-gray-400"
            }`}
          >
            <span>{formatearHora(msg.fecha_creacion)}</span>
            {msg.detectado_sin_stock && (
              <span title="Posible producto sin stock">
                <AlertCircle className="h-3 w-3 text-amber-400" />
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const cargando = loadingConv || (conversacion && loadingMsg);
  const hayConversacion = !!conversacion;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 shrink-0">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold shrink-0">
            {inicial}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-gray-900 truncate">{nombreLead}</h2>
            <p className="text-sm text-gray-500 truncate">
              {lead.datos_contacto?.telefono || "Sin teléfono"}
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {cargando ? (
            <div className="flex items-center justify-center py-12 text-gray-500">Cargando mensajes...</div>
          ) : hayConversacion && mensajes && mensajes.length > 0 ? (
            mensajes.map(renderMensaje)
          ) : hayConversacion ? (
            <div className="text-center py-12 text-gray-500">
              <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p>Esta conversación no tiene mensajes todavía</p>
            </div>
          ) : pendientes.length > 0 ? (
            <>
              <div className="text-center text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg py-2 px-3">
                Mensajes recibidos antes de abrir el chat
              </div>
              {pendientes.map((texto, idx) => (
                <div key={idx} className="flex justify-start">
                  <div className="max-w-[85%] px-3 py-2 rounded-2xl bg-gray-100 text-gray-900 rounded-tl-none">
                    <div className="text-xs mb-1 text-gray-500">{nombreLead}</div>
                    <div className="whitespace-pre-wrap break-words text-sm">{texto}</div>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p>Sin mensajes</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 shrink-0">
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {lead.fecha_creacion ? `Lead creado ${formatearHora(lead.fecha_creacion)}` : ""}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-2 text-gray-700 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerMensajesLeadModal;
