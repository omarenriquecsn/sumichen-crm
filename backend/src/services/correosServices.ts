import fs from 'fs';
import path from 'path';
import { Resend } from 'resend';
import { ApiError } from '../utils/ApiError';
import { getUsuarioByIdDb } from '../repositories/usuariosRepository';
import {
  getCarpetaFirmas,
  MIME_POR_EXT,
} from '../controllers/firmaControllers';

/**
 * Servicio de envío de correo al cliente vía Resend.
 *
 * El correo se envía DESDE EL SERVIDOR (no se abre Gmail/mailto) con cuerpo
 * HTML. La imagen de firma del vendedor se incrusta como ADJUNTO INLINE (`cid`)
 * en el pie: se lee del disco del servidor y se referencia con `<img
 * src="cid:...">`, así los clientes de correo la renderizan siempre (evita que
 * bloqueen la imagen remota y que falle en dev con URLs tipo `localhost`).
 *
 * El `from` se construye con el nombre/apellido del vendedor autenticado sobre
 * el dominio de Resend configurado (`RESEND_DOMAIN`, default
 * `ventas.crmsumichen.com`): `Nombre Apellido <nombre.apellido@ventas...>`.
 */

export interface AdjuntoCorreo {
  filename: string;
  buffer: Buffer;
  mimetype?: string;
}

export interface EnviarCorreoParams {
  vendedorDbId: string;
  to: string;
  asunto: string;
  cuerpoHtml: string;
  adjuntos?: AdjuntoCorreo[];
}

const LIMITE_ADJUNTOS = 10;
const LIMITE_TAMANO_ADJUNTO = 10 * 1024 * 1024; // 10 MB por archivo

/** Normaliza el nombre para el local-part del email: minúsculas, sin tildes,
 *  sin espacios (→ puntos), sin caracteres especiales. */
const normalizarLocalPart = (s: string): string => {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9._-]+/g, '')
    .replace(/^[._-]+|[._-]+$/g, '')
    .replace(/\.{2,}/g, '.');
};

/**
 * Lee la imagen de firma del vendedor desde el disco del servidor y la devuelve
 * lista para adjuntar como adjunto inline (cid). Se parsea el nombre desde la
 * `firma_url` guardada en el perfil y se resuelve contra la carpeta de firmas.
 * Devuelve `null` si no hay URL o el archivo no existe (así nunca se envía un
 * correo con una imagen rota).
 */
const leerImagenFirma = (
  firmaUrl?: string | null,
): { buffer: Buffer; mime: string; ext: string } | null => {
  if (!firmaUrl) return null;
  try {
    const nombre = path.basename(new URL(firmaUrl).pathname);
    if (!nombre) return null;
    const filePath = path.join(getCarpetaFirmas(), nombre);
    if (!fs.existsSync(filePath)) return null;
    const ext = nombre.split('.').pop()?.toLowerCase() || '';
    const mime = MIME_POR_EXT[ext] || 'application/octet-stream';
    return { buffer: fs.readFileSync(filePath), mime, ext };
  } catch {
    return null;
  }
};

/** Arma el HTML del cuerpo con el pie de firma del vendedor (si existe). */
const armarHtmlConPie = (
  cuerpoHtml: string,
  firmaCid?: string | null,
): string => {
  const pie = firmaCid
    ? `
      <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;font-family:Arial,Helvetica,sans-serif;">
        <img src="cid:${firmaCid}" alt="Firma" style="max-width:320px;max-height:120px;height:auto;display:block;" />
      </div>`
    : '';
  return `<!DOCTYPE html>
<html lang="es">
  <body style="margin:0;padding:0;background:#f9fafb;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:32px;font-family:Arial,Helvetica,sans-serif;color:#111827;">
                ${cuerpoHtml}
                ${pie}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;">
                Enviado desde el CRM Sumichem
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

export const enviarCorreoCliente = async ({
  vendedorDbId,
  to,
  asunto,
  cuerpoHtml,
  adjuntos = [],
}: EnviarCorreoParams) => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new ApiError(
      'RESEND_API_KEY no está configurada. Agrega tu API key de Resend en backend/.env',
      500,
    );
  }

  if (!to) {
    throw new ApiError('El destinatario (to) es obligatorio', 400);
  }

  if (adjuntos.length > LIMITE_ADJUNTOS) {
    throw new ApiError(`Máximo ${LIMITE_ADJUNTOS} archivos adjuntos por correo`, 400);
  }
  for (const adj of adjuntos) {
    if (adj.buffer.length > LIMITE_TAMANO_ADJUNTO) {
      throw new ApiError(
        `El archivo "${adj.filename}" supera el límite de 10 MB`,
        400,
      );
    }
  }

  // Perfil del vendedor que envía (id de tabla vendedores).
  const vendedor = await getUsuarioByIdDb(vendedorDbId);
  if (!vendedor) {
    throw new ApiError('Vendedor no encontrado', 404);
  }

  const nombre = vendedor.nombre || 'Vendedor';
  const apellido = vendedor.apellido || '';
  const dominio = process.env.RESEND_DOMAIN || 'ventas.crmsumichen.com';
  const localPart = normalizarLocalPart(`${nombre} ${apellido}`.trim());
  const fromEmail = `${localPart}@${dominio}`;
  const from = `${nombre} ${apellido}`.trim()
    ? `"${`${nombre} ${apellido}`.trim()}" <${fromEmail}>`
    : fromEmail;

  const CID_FIRMA = 'sumichem_firma';
  const firma = leerImagenFirma(vendedor.firma_url);

  const html = armarHtmlConPie(cuerpoHtml || '', firma ? CID_FIRMA : null);

  const resend = new Resend(apiKey);

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject: asunto || 'Contacto desde Sumichem',
    html,
    attachments: [
      ...(firma
        ? [
            {
              filename: `firma.${firma.ext}`,
              content: firma.buffer,
              contentType: firma.mime,
              contentId: CID_FIRMA,
            },
          ]
        : []),
      ...adjuntos.map((adj) => ({
        filename: adj.filename,
        content: adj.buffer.toString('base64'),
      })),
    ],
  });

  if (error) {
    const mensaje = error.message || 'Error enviando el correo';
    if (/domain/i.test(mensaje) || /verify/i.test(mensaje)) {
      throw new ApiError(
        `Resend no puede enviar con "${fromEmail}". Verifica que el dominio ${dominio} esté verificado en Resend.`,
        400,
      );
    }
    throw new ApiError(`Error al enviar el correo: ${mensaje}`, 400);
  }

  return { message: 'Correo enviado correctamente', id: data?.id, from };
};
