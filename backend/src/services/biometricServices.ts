import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import { createClient } from '@supabase/supabase-js';
import { ApiError } from '../utils/ApiError';
import {
  guardarCredencialRepository,
  obtenerCredencialPorCredentialIdRepository,
  obtenerCredencialesPorSupabaseIdRepository,
  actualizarCounterRepository,
  eliminarCredencialRepository,
} from '../repositories/biometricRepository';

// ── Configuración del Relying Party (RP) ────────────────────────────────────
const rpID = process.env.RP_ID || 'localhost';
const rpName = process.env.RP_NAME || 'Sumichem CRM';
const rpOrigins = (process.env.RP_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// ── Almacén de challenges en memoria (TTL 5 min, un solo uso) ───────────────
interface Desafio {
  challenge: string;
  supabase_id?: string;
  tipo: 'registro' | 'login';
  creadoEn: number;
}

const desafios = new Map<string, Desafio>();
const TTL_MS = 5 * 60 * 1000;

const limpiarExpirados = () => {
  const ahora = Date.now();
  for (const [k, v] of desafios) {
    if (ahora - v.creadoEn > TTL_MS) desafios.delete(k);
  }
};

const guardarDesafio = (key: string, desafio: Desafio) => {
  limpiarExpirados();
  desafios.set(key, desafio);
};

const consumirDesafio = (key: string): Desafio | undefined => {
  limpiarExpirados();
  const d = desafios.get(key);
  if (d) desafios.delete(key);
  return d;
};

const supabaseAdmin = () =>
  createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

// ── Registro (mientras el usuario está logueado) ────────────────────────────
export const crearDesafioRegistroService = async (data: {
  supabase_id: string;
  email: string;
  nombre?: string;
}) => {
  const credenciales = await obtenerCredencialesPorSupabaseIdRepository(data.supabase_id);

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: data.email,
    userDisplayName: data.nombre || data.email,
    userID: Buffer.from(data.supabase_id, 'utf8'),
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'required',
    },
    excludeCredentials: credenciales.map((c) => ({ id: c.credential_id })),
  });

  guardarDesafio(`registro:${data.supabase_id}`, {
    challenge: options.challenge,
    supabase_id: data.supabase_id,
    tipo: 'registro',
    creadoEn: Date.now(),
  });

  return options;
};

export const verificarRegistroService = async (data: {
  supabase_id: string;
  response: any;
  dispositivo?: string;
}) => {
  const desafio = consumirDesafio(`registro:${data.supabase_id}`);
  if (!desafio) throw new ApiError('Desafío de registro expirado o inválido. Intenta de nuevo.', 400);

  const { verified, registrationInfo } = await verifyRegistrationResponse({
    response: data.response,
    expectedChallenge: desafio.challenge,
    expectedOrigin: rpOrigins,
    expectedRPID: rpID,
  });

  if (!verified || !registrationInfo) {
    throw new ApiError('La verificación biométrica falló. Intenta de nuevo.', 400);
  }

  await guardarCredencialRepository({
    supabase_id: data.supabase_id,
    credential_id: registrationInfo.credential.id,
    public_key: isoBase64URL.fromBuffer(registrationInfo.credential.publicKey),
    counter: registrationInfo.credential.counter,
    dispositivo: data.dispositivo,
  });

  return { success: true };
};

// ── Login (público, passkeys descubribles: no requiere email) ───────────────
export const crearDesafioLoginService = async () => {
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: 'preferred',
  });

  guardarDesafio(`login:${options.challenge}`, {
    challenge: options.challenge,
    tipo: 'login',
    creadoEn: Date.now(),
  });

  return options;
};

export const verificarLoginService = async (response: any, challenge?: string) => {
  const desafio = consumirDesafio(`login:${challenge ?? response?.challenge}`);
  if (!desafio) throw new ApiError('Desafío de inicio de sesión expirado o inválido. Intenta de nuevo.', 400);

  const credencial = await obtenerCredencialPorCredentialIdRepository(response?.id);
  if (!credencial) {
    throw new ApiError('Esta huella/dispositivo no está registrado. Regístralo desde Configuración.', 400);
  }

  const { verified, authenticationInfo } = await verifyAuthenticationResponse({
    response,
    expectedChallenge: desafio.challenge,
    expectedOrigin: rpOrigins,
    expectedRPID: rpID,
    credential: {
      id: credencial.credential_id,
      publicKey: isoBase64URL.toBuffer(credencial.public_key),
      counter: credencial.counter,
    },
  });

  if (!verified) {
    throw new ApiError('La verificación biométrica falló. Intenta de nuevo.', 400);
  }

  await actualizarCounterRepository(credencial.credential_id, authenticationInfo.newCounter);

  // Minter la sesión de Supabase sin contraseña: se genera un magic-link
  // (hashed_token) que el frontend canjea con supabase.auth.verifyOtp().
  const supabase = supabaseAdmin();
  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
    credencial.supabase_id
  );
  if (userError || !userData?.user?.email) {
    throw new ApiError('No se encontró el usuario asociado a esta huella.', 500);
  }

  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: userData.user.email,
  });

  if (linkError || !linkData?.properties?.hashed_token) {
    throw new ApiError('No se pudo generar el acceso. Intenta de nuevo.', 500);
  }

  return {
    success: true,
    token_hash: linkData.properties.hashed_token,
    email: userData.user.email,
  };
};

// ── Gestión de credenciales (del usuario logueado) ──────────────────────────
export const listarCredencialesService = (supabaseId: string) =>
  obtenerCredencialesPorSupabaseIdRepository(supabaseId);

export const eliminarCredencialService = async (id: string, supabaseId: string) => {
  const credencial = await obtenerCredencialesPorSupabaseIdRepository(supabaseId);
  const existe = credencial.find((c) => c.id === id);
  if (!existe) throw new ApiError('Credencial no encontrada', 404);
  await eliminarCredencialRepository(id);
  return { success: true };
};
