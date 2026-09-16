/**
 * Helpers para abrir WhatsApp con un lead desde el CRM.
 */

/**
 * Normaliza un teléfono venezolano al formato internacional que espera
 * `wa.me` (solo dígitos, con prefijo 58).
 */
export const normalizarTelefonoWhatsApp = (telefono: string): string => {
  let digitos = (telefono || "").replace(/\D/g, "");
  if (digitos.startsWith("0")) {
    digitos = `58${digitos.slice(1)}`;
  } else if (!digitos.startsWith("58")) {
    digitos = `58${digitos}`;
  }
  return digitos;
};

/**
 * Mensaje prellenado para atender a un lead:
 * "Hola {cliente}, soy {vendedor}, ¿en qué puedo ayudarte el día de hoy?"
 */
export const construirMensajeAtenderLead = (
  nombreCliente?: string,
  nombreVendedor?: string,
): string => {
  const cliente = (nombreCliente || "").trim() || "cliente";
  const vendedor = (nombreVendedor || "").trim();
  return vendedor
    ? `Hola ${cliente}, soy ${vendedor}, ¿en qué puedo ayudarte el día de hoy?`
    : `Hola ${cliente}, ¿en qué puedo ayudarte el día de hoy?`;
};

/**
 * Construye el enlace `wa.me` con el mensaje codificado.
 */
export const construirLinkWhatsApp = (telefono: string, mensaje: string): string => {
  const digitos = normalizarTelefonoWhatsApp(telefono);
  return `https://wa.me/${digitos}?text=${encodeURIComponent(mensaje)}`;
};
