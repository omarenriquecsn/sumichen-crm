import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "../../context/useAuth";
import { useSupabase } from "../../hooks/useSupabase";
import {
  construirLinkWhatsApp,
  construirMensajeAtenderLead,
} from "../../utils/whatsapp";

/**
 * Atiende un lead disparado desde la notificación push "Nuevo lead asignado":
 * la notificación abre la app en `#/chat?accion=atender&lead=...`.
 *
 * Marca el lead como `contactado` (solo si sigue asignado al usuario) y ofrece
 * abrir WhatsApp con el mensaje prellenado. El botón es necesario porque los
 * navegadores exigen un gesto del usuario para abrir una app externa.
 */
export const AtenderLeadDesdePush: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { userData } = useAuth();
  const { useContactarLead } = useSupabase();
  const contactarLead = useContactarLead();
  const [atencion, setAtencion] = useState<{ telefono: string; nombre: string } | null>(
    null,
  );

  useEffect(() => {
    if (searchParams.get("accion") !== "atender") return;
    const leadId = searchParams.get("lead");
    const telefono = searchParams.get("telefono") || "";
    const nombre = searchParams.get("nombre") || "";
    setSearchParams({}, { replace: true });
    if (!leadId) return;

    // Al marcar el lead como contactado se valida que siga asignado al usuario:
    // si ya no lo está (fue reasignado), no se ofrece abrir WhatsApp.
    contactarLead.mutate(leadId, {
      onSuccess: () => {
        if (telefono) setAtencion({ telefono, nombre });
      },
      onError: (err) => {
        toast.error(err.message || "Este lead ya no está asignado a ti");
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, setSearchParams]);

  if (!atencion) return null;

  const cerrar = () => setAtencion(null);

  const abrirWhatsApp = () => {
    const vendedor = userData ? `${userData.nombre} ${userData.apellido}`.trim() : "";
    const mensaje = construirMensajeAtenderLead(atencion.nombre, vendedor);
    window.open(construirLinkWhatsApp(atencion.telefono, mensaje), "_blank", "noopener,noreferrer");
    cerrar();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-5">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <MessageCircle className="h-6 w-6" />
          </span>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Atender lead
            </h3>
            <p className="text-sm text-gray-500">
              {atencion.nombre || atencion.telefono}
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-5">
          El lead se marcó como <span className="font-medium">en gestión</span>. Abre
          WhatsApp para escribirle con un mensaje ya listo.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={cerrar}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={abrirWhatsApp}
            className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
          >
            <MessageCircle className="h-4 w-4" />
            Abrir WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
};
