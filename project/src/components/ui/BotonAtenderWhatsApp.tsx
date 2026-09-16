import React from "react";
import { MessageCircle } from "lucide-react";
import { toast } from "react-toastify";
import { Lead } from "../../types";
import { useAuth } from "../../context/useAuth";
import { useSupabase } from "../../hooks/useSupabase";
import {
  construirLinkWhatsApp,
  construirMensajeAtenderLead,
} from "../../utils/whatsapp";

interface BotonAtenderWhatsAppProps {
  lead: Lead;
  nombreVendedor?: string;
  className?: string;
  compacto?: boolean;
}

/**
 * Botón "Atender desde tu WhatsApp": marca el lead como `contactado` (en
 * gestión) y abre WhatsApp con el número del lead y un mensaje prellenado.
 */
export const BotonAtenderWhatsApp: React.FC<BotonAtenderWhatsAppProps> = ({
  lead,
  nombreVendedor,
  className,
  compacto = false,
}) => {
  const { userData } = useAuth();
  const { useContactarLead } = useSupabase();
  const contactarLead = useContactarLead();

  const telefono = lead.datos_contacto?.telefono;
  const estadosAtendibles = ["asignado", "contactado", "calificado", "reasignado"];
  if (!telefono || !estadosAtendibles.includes(lead.estado)) return null;

  const vendedorAsignado = lead.vendedor_asignado
    ? `${lead.vendedor_asignado.nombre ?? ""} ${lead.vendedor_asignado.apellido ?? ""}`.trim()
    : "";
  const vendedor =
    nombreVendedor ||
    vendedorAsignado ||
    (userData ? `${userData.nombre} ${userData.apellido}`.trim() : "");

  const handleAtender = () => {
    // El backend es idempotente; no bloquea la apertura de WhatsApp.
    contactarLead.mutate(lead.id, {
      onError: (err) => toast.error(err.message || "No se pudo actualizar el lead"),
    });
    const mensaje = construirMensajeAtenderLead(lead.datos_contacto?.nombre, vendedor);
    window.open(construirLinkWhatsApp(telefono, mensaje), "_blank", "noopener,noreferrer");
  };

  return (
    <button
      type="button"
      onClick={handleAtender}
      title="Atender por WhatsApp"
      className={
        className ??
        "inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
      }
    >
      <MessageCircle className="h-4 w-4 shrink-0" />
      {!compacto && <span>Atender desde tu WhatsApp</span>}
    </button>
  );
};
