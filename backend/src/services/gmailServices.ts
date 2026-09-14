import { google } from 'googleapis';
import MailComposer from 'nodemailer/lib/mail-composer';
import { ApiError } from '../utils/ApiError';
import { getRedirectUri } from '../utils/googleOAuth';

/**
 * Envío de correo usando la API de Gmail del propio vendedor.
 *
 * Se usa `gmail.users.messages.send` (NO SMTP) para que el correo quede
 * guardado en la carpeta "Enviados" de la cuenta del vendedor. El mensaje MIME
 * (HTML + adjuntos + firma inline por CID) se construye con `MailComposer` de
 * nodemailer y se pasa codificado en base64url, que es lo que espera la API.
 */

export interface AdjuntoGmail {
  filename: string;
  buffer: Buffer;
  mimetype?: string;
}

export interface EnviarCorreoGmailParams {
  nombre: string;
  apellido: string;
  // Correo autorizado por el vendedor (se usa como remitente).
  googleEmail: string;
  refreshToken: string;
  to: string;
  asunto: string;
  html: string;
  firma?: { buffer: Buffer; mime: string; ext: string } | null;
  cidFirma?: string;
  adjuntos?: AdjuntoGmail[];
}

/** Codifica el mensaje MIME a base64url (formato `raw` de la API de Gmail). */
const codificarRaw = (mime: Buffer): string =>
  mime
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

export const enviarCorreoConGmail = async ({
  nombre,
  apellido,
  googleEmail,
  refreshToken,
  to,
  asunto,
  html,
  firma,
  cidFirma,
  adjuntos = [],
}: EnviarCorreoGmailParams): Promise<{ id: string | null }> => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new ApiError(
      'Gmail no está configurado: faltan GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET en backend/.env',
      500,
    );
  }

  const oauth2 = new google.auth.OAuth2(
    clientId,
    clientSecret,
    getRedirectUri(),
  );
  oauth2.setCredentials({ refresh_token: refreshToken });

  const gmail = google.gmail({ version: 'v1', auth: oauth2 });

  const nombreCompleto = `${nombre} ${apellido}`.trim();
  const composer = new MailComposer({
    from: { name: nombreCompleto || googleEmail, address: googleEmail },
    to,
    subject: asunto || 'Contacto desde Sumichem',
    html,
    attachments: [
      ...(firma && cidFirma
        ? [
            {
              filename: `firma.${firma.ext}`,
              content: firma.buffer,
              contentType: firma.mime,
              cid: cidFirma,
              contentDisposition: 'inline' as const,
            },
          ]
        : []),
      ...adjuntos.map((adj) => ({
        filename: adj.filename,
        content: adj.buffer,
        contentType: adj.mimetype,
      })),
    ],
  });

  let raw: Buffer;
  try {
    raw = (await composer.compile().build()) as Buffer;
  } catch (err) {
    throw new ApiError(
      `No se pudo preparar el correo: ${
        err instanceof Error ? err.message : 'error desconocido'
      }`,
      500,
    );
  }

  try {
    const { data } = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: codificarRaw(raw) },
    });
    return { id: data.id ?? null };
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : 'Error desconocido';
    if (/invalid_grant|invalid_credentials|unauthorized|invalid_token/i.test(mensaje)) {
      throw new ApiError(
        'Tu cuenta de Gmail dejó de estar autorizada. Vuelve a conectarla desde Configuración → Perfil.',
        400,
      );
    }
    throw new ApiError(`No se pudo enviar el correo con Gmail: ${mensaje}`, 400);
  }
};
