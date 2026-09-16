import { Lead } from '../entities/Lead';

/**
 * Construye la URL que abre el chat del lead con la acción "atender".
 *
 * Al tocar la notificación, el frontend marca el lead como `contactado` y
 * ofrece abrir WhatsApp con el mensaje prellenado al cliente. Se incluyen el
 * teléfono y el nombre para que la app no tenga que consultar el lead.
 */
export const construirUrlAtenderLead = (
  lead: Pick<Lead, 'id' | 'datos_contacto'>,
): string => {
  const telefono = (lead.datos_contacto?.telefono || '').replace(/\D/g, '');
  const nombre = lead.datos_contacto?.nombre || '';
  const params = new URLSearchParams({ accion: 'atender', lead: lead.id });
  if (telefono) params.set('telefono', telefono);
  if (nombre) params.set('nombre', nombre);
  return `#/chat?${params.toString()}`;
};
