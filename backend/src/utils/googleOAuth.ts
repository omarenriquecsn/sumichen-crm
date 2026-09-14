import { google } from 'googleapis';
import jwt from 'jsonwebtoken';
import { ApiError } from './ApiError';

/**
 * Utilidades compartidas del flujo Gmail OAuth2.
 *
 * El vendedor conecta su propia cuenta de Gmail desde Configuración → Perfil.
 * Guardamos su `refresh_token` y enviamos los correos con la API de Gmail
 * (`messages.send`) para que queden en su carpeta "Enviados".
 */

export const SCOPES = [
  // Enviar correos en nombre del usuario.
  'https://www.googleapis.com/auth/gmail.send',
  // Leer el correo autorizado (para mostrarlo en Configuración).
  'https://www.googleapis.com/auth/userinfo.email',
  'openid',
];

/** Valida que las credenciales de Google estén configuradas. */
export const getGoogleCredentials = (): {
  clientId: string;
  clientSecret: string;
} => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new ApiError(
      'Gmail no está configurado: faltan GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET en backend/.env',
      500,
    );
  }
  return { clientId, clientSecret };
};

/** Indica si el backend tiene credenciales de Google (para la UI). */
export const googleConfigurado = (): boolean =>
  Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

/**
 * URI de redireccionamiento autorizado en Google Cloud. Debe coincidir EXACTO.
 * Si no se define `GOOGLE_REDIRECT_URL`, se arma con `PUBLIC_API_URL`.
 */
export const getRedirectUri = (): string => {
  if (process.env.GOOGLE_REDIRECT_URL) return process.env.GOOGLE_REDIRECT_URL;
  const base = process.env.PUBLIC_API_URL || 'http://localhost:3000';
  return `${base.replace(/\/+$/, '')}/auth/google/callback`;
};

/** URL base del frontend a la que se vuelve tras el callback de Google. */
export const getFrontendUrl = (): string =>
  (
    process.env.FRONTEND_URL ||
    process.env.APP_PUBLIC_URL ||
    process.env.RP_ORIGIN ||
    'https://crmsumichen.com'
  ).replace(/\/+$/, '');

/** Crea un cliente OAuth2 configurado con las credenciales de la app. */
export const crearOAuthClient = (): InstanceType<typeof google.auth.OAuth2> => {
  const { clientId, clientSecret } = getGoogleCredentials();
  return new google.auth.OAuth2(clientId, clientSecret, getRedirectUri());
};

const stateSecret = (): string =>
  process.env.GOOGLE_STATE_SECRET ||
  process.env.SUPABASE_JWT_SECRET ||
  'google-oauth-state-secret';

/** Firma un `state` de un solo uso que identifica al vendedor que autoriza. */
export const firmarState = (supabaseId: string): string =>
  jwt.sign({ supabaseId, tipo: 'google-oauth' }, stateSecret(), {
    expiresIn: '15m',
  });

/** Verifica el `state` devuelto por Google y extrae el supabase_id. */
export const verificarState = (state: string): string => {
  try {
    const decoded = jwt.verify(state, stateSecret()) as {
      supabaseId?: string;
      tipo?: string;
    };
    if (decoded.tipo !== 'google-oauth' || !decoded.supabaseId) {
      throw new Error('state inválido');
    }
    return decoded.supabaseId;
  } catch {
    throw new ApiError(
      'El enlace de autorización de Google venció o no es válido. Vuelve a conectar tu cuenta.',
      400,
    );
  }
};
