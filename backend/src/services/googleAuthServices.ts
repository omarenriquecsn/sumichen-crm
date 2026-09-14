import { google } from 'googleapis';
import { ApiError } from '../utils/ApiError';
import {
  crearOAuthClient,
  firmarState,
  verificarState,
  googleConfigurado,
  SCOPES,
} from '../utils/googleOAuth';
import {
  getUsuarioById,
  getUsuarioConGoogleBySupabaseId,
  getUsuarioConGoogleByIdDb,
  updateUsuario,
} from '../repositories/usuariosRepository';

/**
 * Lógica del flujo Gmail OAuth2:
 *  1. `generarUrlAutorizacionService` arma la URL de consentimiento de Google
 *     con un `state` firmado que identifica al vendedor.
 *  2. `procesarCallbackService` intercambia el `code` por tokens, obtiene el
 *     correo autorizado y los guarda en el perfil del vendedor.
 *  3. `estadoGoogleService` informa si la cuenta está conectada.
 *  4. `desconectarGoogleService` revoca el token en Google y limpia el perfil.
 */

export const generarUrlAutorizacionService = async (supabaseId: string) => {
  const oauth2 = crearOAuthClient();
  const url = oauth2.generateAuthUrl({
    access_type: 'offline',
    // `consent` asegura que Google SIEMPRE devuelva refresh_token (necesario
    // para reenviar correos sin volver a pedir permiso).
    prompt: 'select_account consent',
    scope: SCOPES,
    state: firmarState(supabaseId),
    include_granted_scopes: true,
  });
  return { url };
};

export const procesarCallbackService = async (code: string, state: string) => {
  const supabaseId = verificarState(state);

  const usuario = await getUsuarioConGoogleBySupabaseId(supabaseId);
  if (!usuario) throw new ApiError('Usuario no encontrado', 404);

  const oauth2 = crearOAuthClient();
  const { tokens } = await oauth2.getToken(code);
  oauth2.setCredentials(tokens);

  let email: string | null = usuario.google_email ?? null;
  try {
    const info = await google.oauth2({ version: 'v2', auth: oauth2 }).userinfo.get();
    email = info.data.email || email;
  } catch {
    // Si falla userinfo, conservamos el email previo (si lo había).
  }

  // Google puede no devolver refresh_token si ya se había autorizado antes; en
  // ese caso conservamos el guardado.
  const refreshToken = tokens.refresh_token || usuario.google_refresh_token;
  if (!refreshToken) {
    throw new ApiError(
      'Google no devolvió un token de acceso permanente. Intenta conectar la cuenta de nuevo.',
      400,
    );
  }

  await updateUsuario(usuario.id, {
    google_email: email,
    google_refresh_token: refreshToken,
    google_access_token: tokens.access_token || null,
    google_token_expiry: tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : null,
  });

  return { message: 'Cuenta de Gmail conectada correctamente', email };
};

export const estadoGoogleService = async (supabaseId: string) => {
  const usuario = await getUsuarioById(supabaseId);
  if (!usuario) throw new ApiError('Usuario no encontrado', 404);
  return {
    configurado: googleConfigurado(),
    conectado: Boolean(usuario.google_email),
    email: usuario.google_email ?? null,
  };
};

export const desconectarGoogleService = async (supabaseId: string) => {
  const usuario = await getUsuarioConGoogleBySupabaseId(supabaseId);
  if (!usuario) throw new ApiError('Usuario no encontrado', 404);

  // Revocar el token en Google (best effort: si falla, igual limpiamos).
  if (usuario.google_refresh_token) {
    try {
      const oauth2 = crearOAuthClient();
      await oauth2.revokeToken(usuario.google_refresh_token);
    } catch {
      // Ignoramos: lo importante es borrar los tokens de nuestra base.
    }
  }

  await updateUsuario(usuario.id, {
    google_email: null,
    google_refresh_token: null,
    google_access_token: null,
    google_token_expiry: null,
  });

  return { message: 'Cuenta de Gmail desconectada' };
};

/**
 * Obtiene el correo autorizado del vendedor (id de tabla) junto con el
 * refresh_token. Usado por el envío de correo. Devuelve null si no hay cuenta
 * conectada o faltan datos.
 */
export const getCuentaGmailVendedor = async (vendedorDbId: string) => {
  const usuario = await getUsuarioConGoogleByIdDb(vendedorDbId);
  if (!usuario?.google_refresh_token || !usuario.google_email) return null;
  return {
    googleEmail: usuario.google_email,
    refreshToken: usuario.google_refresh_token,
  };
};
