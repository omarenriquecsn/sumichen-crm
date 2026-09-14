/**
 * Helpers para mostrar el remitente real del correo al cliente.
 *
 * El backend decide el `from` en el momento del envío
 * (`backend/src/services/correosServices.ts`): si el vendedor conectó su Gmail
 * usa esa cuenta; si no, arma `nombre.apellido@RESEND_DOMAIN`. Aquí replicamos
 * esa misma lógica de normalización para poder mostrarlo ANTES de enviar.
 */

const DOMINIO_RESEND =
  (import.meta.env.VITE_RESEND_DOMAIN as string | undefined) ||
  "ventas.crmsumichen.com";

/** Normaliza el nombre para el local-part del email: minúsculas, sin tildes,
 *  sin espacios (→ puntos), sin caracteres especiales. Misma lógica que el
 *  backend (`normalizarLocalPart`). */
export const normalizarLocalPart = (s: string): string => {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._-]+/g, "")
    .replace(/^[._-]+|[._-]+$/g, "")
    .replace(/\.{2,}/g, ".");
};

/** Correo de respaldo con el que sale el mensaje cuando no hay Gmail conectado
 *  (ej. `norangel.guedez@ventas.crmsumichen.com`). */
export const formatearRemitenteFallback = (
  nombre?: string,
  apellido?: string,
): string => {
  const localPart = normalizarLocalPart(`${nombre ?? ""} ${apellido ?? ""}`.trim());
  return `${localPart || "ventas"}@${DOMINIO_RESEND}`;
};
