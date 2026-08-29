import { supabase } from "./supabase";

const URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

function arrayBufferToBase64Url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

export function soportaBiometria(): boolean {
  return typeof window !== "undefined" && !!window.PublicKeyCredential;
}

async function obtenerToken(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Sesión no válida");
  return session.access_token;
}

// ── Tipos de las opciones JSON que devuelve el backend ──────────────────────
interface CredencialJson {
  id: string;
  type?: string;
  transports?: string[];
}

interface OpcionesRegistroJson {
  rp: { name: string; id: string };
  user: { name: string; displayName: string; id: string };
  challenge: string;
  pubKeyCredParams: { type: string; alg: number }[];
  timeout?: number;
  attestation?: string;
  authenticatorSelection?: Record<string, unknown>;
  excludeCredentials?: CredencialJson[];
}

interface OpcionesLoginJson {
  challenge: string;
  rpId?: string;
  timeout?: number;
  userVerification?: string;
  allowCredentials?: CredencialJson[];
}

// ── Forma del PublicKeyCredential devuelto por el navegador ─────────────────
interface CredencialNavegador {
  id: string;
  rawId: ArrayBuffer;
  type: string;
  response: {
    clientDataJSON: ArrayBuffer;
    attestationObject?: ArrayBuffer;
    authenticatorData?: ArrayBuffer;
    signature?: ArrayBuffer;
    userHandle?: ArrayBuffer | null;
    getTransports?: () => string[];
  };
  getClientExtensionResults?: () => Record<string, unknown>;
}

// ── Conversión de opciones JSON → API nativa de WebAuthn ────────────────────
function aOpcionesRegistro(
  opciones: OpcionesRegistroJson
): PublicKeyCredentialCreationOptions {
  return {
    rp: opciones.rp,
    user: { ...opciones.user, id: base64UrlToUint8Array(opciones.user.id) },
    challenge: base64UrlToUint8Array(opciones.challenge),
    pubKeyCredParams: opciones.pubKeyCredParams,
    timeout: opciones.timeout,
    attestation: opciones.attestation as AttestationConveyancePreference,
    authenticatorSelection:
      opciones.authenticatorSelection as AuthenticatorSelectionCriteria,
    excludeCredentials: opciones.excludeCredentials?.map((c) => ({
      type: "public-key" as const,
      id: base64UrlToUint8Array(c.id),
      transports: c.transports as AuthenticatorTransport[] | undefined,
    })),
  };
}

function aOpcionesLogin(opciones: OpcionesLoginJson): PublicKeyCredentialRequestOptions {
  return {
    challenge: base64UrlToUint8Array(opciones.challenge),
    rpId: opciones.rpId,
    timeout: opciones.timeout,
    userVerification: opciones.userVerification as UserVerificationRequirement,
    allowCredentials: opciones.allowCredentials?.map((c) => ({
      type: "public-key" as const,
      id: base64UrlToUint8Array(c.id),
      transports: c.transports as AuthenticatorTransport[] | undefined,
    })),
  };
}

// ── Serialización de la credencial del navegador → JSON para el backend ─────
function serializarCredencial(cred: CredencialNavegador): Record<string, unknown> {
  return {
    id: cred.id,
    rawId: arrayBufferToBase64Url(cred.rawId),
    type: cred.type,
    response: {
      clientDataJSON: arrayBufferToBase64Url(cred.response.clientDataJSON),
      attestationObject: cred.response.attestationObject
        ? arrayBufferToBase64Url(cred.response.attestationObject)
        : undefined,
      authenticatorData: cred.response.authenticatorData
        ? arrayBufferToBase64Url(cred.response.authenticatorData)
        : undefined,
      signature: cred.response.signature
        ? arrayBufferToBase64Url(cred.response.signature)
        : undefined,
      userHandle: cred.response.userHandle
        ? arrayBufferToBase64Url(cred.response.userHandle)
        : undefined,
    },
    clientExtensionResults: cred.getClientExtensionResults
      ? cred.getClientExtensionResults()
      : {},
    transports: cred.response.getTransports
      ? cred.response.getTransports()
      : undefined,
  };
}

/**
 * Registra la huella/rostro de este dispositivo para el usuario logueado.
 * Devuelve true si el dispositivo quedó registrado.
 */
export async function registrarBiometrico(dispositivo?: string): Promise<boolean> {
  if (!soportaBiometria()) {
    throw new Error("Este navegador no soporta autenticación biométrica (WebAuthn).");
  }
  const token = await obtenerToken();

  const opcionesRes = await fetch(`${URL}/auth/biometric/registrar/inicio`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!opcionesRes.ok) {
    throw new Error("No se pudo iniciar el registro biométrico.");
  }
  const opcionesJson = (await opcionesRes.json()) as OpcionesRegistroJson;

  const credencial = (await navigator.credentials.create({
    publicKey: aOpcionesRegistro(opcionesJson),
  })) as CredencialNavegador | null;
  if (!credencial) throw new Error("Registro biométrico cancelado.");

  const completarRes = await fetch(`${URL}/auth/biometric/registrar/completar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      response: serializarCredencial(credencial),
      dispositivo: dispositivo || navigator.userAgent,
    }),
  });
  if (!completarRes.ok) {
    const err = (await completarRes.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(err.error || "No se pudo guardar la huella.");
  }
  return true;
}

/**
 * Inicia sesión con huella/rostro (passkey descubrible, sin email/contraseña).
 * Al terminar, el usuario queda autenticado en Supabase (sesión activa).
 */
export async function iniciarSesionBiometrica(): Promise<{ email?: string }> {
  if (!soportaBiometria()) {
    throw new Error("Este navegador no soporta autenticación biométrica (WebAuthn).");
  }

  const inicioRes = await fetch(`${URL}/auth/biometric/login/inicio`, {
    method: "POST",
  });
  if (!inicioRes.ok) throw new Error("No se pudo iniciar el acceso biométrico.");
  const opcionesJson = (await inicioRes.json()) as OpcionesLoginJson;

  let credencial: CredencialNavegador | null;
  try {
    credencial = (await navigator.credentials.get({
      publicKey: aOpcionesLogin(opcionesJson),
    })) as CredencialNavegador | null;
  } catch (e: unknown) {
    const err = e as { name?: string };
    if (err?.name === "NotAllowedError") {
      throw new Error(
        "No se encontró una huella registrada en este dispositivo o la cancelaste. Regístrala en Configuración → Seguridad."
      );
    }
    throw e;
  }
  if (!credencial) throw new Error("Acceso biométrico cancelado.");

  const completarRes = await fetch(`${URL}/auth/biometric/login/completar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ response: serializarCredencial(credencial) }),
  });
  if (!completarRes.ok) {
    const err = (await completarRes.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(err.error || "La verificación biométrica falló.");
  }
  const data = (await completarRes.json()) as { token_hash?: string; email?: string };
  const tokenHash = data.token_hash;
  const email = data.email;
  if (!tokenHash || !email) {
    throw new Error("Respuesta inválida del servidor.");
  }

  const { error } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: tokenHash,
    email,
  });
  if (error) throw new Error(error.message || "Error iniciando sesión biométrica.");

  return { email };
}

export interface CredencialBiometrica {
  id: string;
  credential_id: string;
  dispositivo: string | null;
  fecha_creacion: string;
}

export async function listarCredenciales(): Promise<CredencialBiometrica[]> {
  const token = await obtenerToken();
  const res = await fetch(`${URL}/auth/biometric/credenciales`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Error listando credenciales biométricas.");
  return res.json();
}

export async function eliminarCredencial(id: string): Promise<void> {
  const token = await obtenerToken();
  const res = await fetch(`${URL}/auth/biometric/credenciales/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || "Error eliminando la credencial.");
  }
}
