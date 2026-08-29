import { Request, Response } from 'express';
import {
  crearDesafioRegistroService,
  verificarRegistroService,
  crearDesafioLoginService,
  verificarLoginService,
  listarCredencialesService,
  eliminarCredencialService,
} from '../services/biometricServices';

const supabaseIdDe = (req: Request): string | undefined => (req as any).user?.id;

// ── Registro (JWT) ───────────────────────────────────────────────────────────
export const iniciarRegistroBiometrico = async (req: Request, res: Response) => {
  const supabaseId = supabaseIdDe(req);
  if (!supabaseId) return res.status(401).json({ error: 'No autorizado' });

  const user = (req as any).user;
  const options = await crearDesafioRegistroService({
    supabase_id: supabaseId,
    email: user?.email || '',
    nombre: user?.user_metadata?.nombre
      ? `${user.user_metadata.nombre} ${user.user_metadata.apellido || ''}`.trim()
      : undefined,
  });
  res.json(options);
};

export const completarRegistroBiometrico = async (req: Request, res: Response) => {
  const supabaseId = supabaseIdDe(req);
  if (!supabaseId) return res.status(401).json({ error: 'No autorizado' });

  const { response, dispositivo } = req.body || {};
  if (!response) return res.status(400).json({ error: 'Respuesta WebAuthn requerida' });

  const resultado = await verificarRegistroService({
    supabase_id: supabaseId,
    response,
    dispositivo: dispositivo || req.headers['user-agent'] || 'Dispositivo',
  });
  res.json(resultado);
};

// ── Login (público) ──────────────────────────────────────────────────────────
export const iniciarLoginBiometrico = async (req: Request, res: Response) => {
  const options = await crearDesafioLoginService();
  res.json(options);
};

export const completarLoginBiometrico = async (req: Request, res: Response) => {
  const { response } = req.body || {};
  if (!response) return res.status(400).json({ error: 'Respuesta WebAuthn requerida' });

  const resultado = await verificarLoginService(response);
  res.json(resultado);
};

// ── Gestión de credenciales (JWT) ───────────────────────────────────────────
export const listarCredencialesBiometricas = async (req: Request, res: Response) => {
  const supabaseId = supabaseIdDe(req);
  if (!supabaseId) return res.status(401).json({ error: 'No autorizado' });

  const credenciales = await listarCredencialesService(supabaseId);
  res.json(
    credenciales.map((c) => ({
      id: c.id,
      credential_id: c.credential_id,
      dispositivo: c.dispositivo,
      fecha_creacion: c.fecha_creacion,
    }))
  );
};

export const eliminarCredencialBiometrica = async (req: Request, res: Response) => {
  const supabaseId = supabaseIdDe(req);
  if (!supabaseId) return res.status(401).json({ error: 'No autorizado' });

  const resultado = await eliminarCredencialService(req.params.id, supabaseId);
  res.json(resultado);
};
