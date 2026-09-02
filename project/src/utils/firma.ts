/**
 * Firma / logo del vendedor para el pie del correo enviado al cliente.
 *
 * El correo se envía DESDE EL SERVIDOR (vía Resend) con cuerpo HTML, de modo
 * que la imagen de firma se incrusta como `<img>` en el pie y el cliente la ve
 * renderizada (no como texto).
 */

/** Pie HTML con la imagen de firma del vendedor (vacío si no hay firma). */
export const generarPieCorreoHtml = (firmaUrl?: string | null): string => {
  if (!firmaUrl) return "";
  return `<div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;">
    <img src="${firmaUrl}" alt="Firma" style="max-width:320px;max-height:120px;height:auto;display:block;" />
  </div>`;
};

/** Agrega el pie HTML con la firma del vendedor al cuerpo del correo. */
export const armarCuerpoConFirma = (
  cuerpo: string,
  firmaUrl?: string | null,
): string => {
  return `${cuerpo}${generarPieCorreoHtml(firmaUrl)}`;
};
