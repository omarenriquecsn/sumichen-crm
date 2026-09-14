import { Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';
import { getFrontendUrl } from '../utils/googleOAuth';
import {
  generarUrlAutorizacionService,
  procesarCallbackService,
  estadoGoogleService,
  desconectarGoogleService,
} from '../services/googleAuthServices';

const supabaseIdDe = (req: Request): string | undefined => req.user?.id;

const redirigirConResultado = (
  res: Response,
  resultado: 'success' | 'error',
): void => {
  const frontend = getFrontendUrl();
  res.redirect(`${frontend}/#/configuracion?google=${resultado}`);
};

/**
 * GET /auth/google/url (JWT) — devuelve la URL de consentimiento de Google
 * para que el frontend redirija al navegador. Se hace así (y no con un
 * redirect directo) porque una navegación completa no puede llevar el header
 * Authorization con el JWT de Supabase.
 */
export const obtenerUrlAutorizacion = async (req: Request, res: Response) => {
  const supabaseId = supabaseIdDe(req);
  if (!supabaseId) throw new ApiError('No autorizado', 401);
  const resultado = await generarUrlAutorizacionService(supabaseId);
  res.json(resultado);
};

/**
 * GET /auth/google/callback (público) — Google redirige aquí con `code` y
 * `state`. Guarda los tokens y vuelve al frontend con un query de resultado.
 */
export const callbackGoogle = async (req: Request, res: Response) => {
  const { code, state, error } = req.query;

  if (error || !code || !state) {
    return redirigirConResultado(res, 'error');
  }

  try {
    await procesarCallbackService(String(code), String(state));
    redirigirConResultado(res, 'success');
  } catch (err) {
    console.error('[google-oauth] Error en el callback:', err);
    redirigirConResultado(res, 'error');
  }
};

/** GET /auth/google/status (JWT) — estado de la conexión Gmail del vendedor. */
export const estadoGoogle = async (req: Request, res: Response) => {
  const supabaseId = supabaseIdDe(req);
  if (!supabaseId) throw new ApiError('No autorizado', 401);
  const resultado = await estadoGoogleService(supabaseId);
  res.json(resultado);
};

/** DELETE /auth/google (JWT) — desconecta la cuenta de Gmail del vendedor. */
export const desconectarGoogle = async (req: Request, res: Response) => {
  const supabaseId = supabaseIdDe(req);
  if (!supabaseId) throw new ApiError('No autorizado', 401);
  const resultado = await desconectarGoogleService(supabaseId);
  res.json(resultado);
};
