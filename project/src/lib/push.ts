import { supabase } from "./supabase";

const URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export interface SuscripcionGuardada {
  id: string;
  vendedor_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  dispositivo: string | null;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

/** Convierte la clave VAPID (base64url) a Uint8Array para pushManager.subscribe. */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function soportaPush(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window;
}

export type EstadoPermiso = "soportado" | "no_soportado" | "denegado" | "no_disponible";

/** Estado del permiso de notificaciones en este navegador/dispositivo. */
export function obtenerEstadoPermiso(): EstadoPermiso {
  if (!soportaPush()) return "no_soportado";
  if (typeof Notification === "undefined") return "no_disponible";
  if (Notification.permission === "denied") return "denegado";
  return "soportado"; // 'default' (aún no decidido) o 'granted'
}

export type TipoEstadoPermiso = "no_soportado" | "denegado" | "pendiente" | "activado";

/** Clasifica el permiso para la UI (pendiente = aún no decidido). */
export function tipoEstadoPermiso(): TipoEstadoPermiso {
  if (!soportaPush() || typeof Notification === "undefined") return "no_soportado";
  if (Notification.permission === "denied") return "denegado";
  if (Notification.permission === "granted") return "activado";
  return "pendiente";
}

export function permisoOtorgado(): boolean {
  return typeof Notification !== "undefined" && Notification.permission === "granted";
}

async function obtenerRegistration(): Promise<ServiceWorkerRegistration> {
  if (navigator.serviceWorker.controller) {
    return await navigator.serviceWorker.ready;
  }
  const reg = await navigator.serviceWorker.register("/sw.js");
  return reg;
}

/**
 * Pide permiso y suscribe este dispositivo a Web Push, guardando la
 * suscripción en el backend (asociada al vendedor autenticado).
 */
export async function suscribirPush(dispositivo?: string): Promise<{
  suscripcion: SuscripcionGuardada;
  permiso: NotificationPermission;
}> {
  if (!soportaPush()) {
    throw new Error("Este navegador no soporta notificaciones push");
  }

  const permiso = await Notification.requestPermission();
  if (permiso !== "granted") {
    throw new Error(
      permiso === "denied"
        ? "Permiso de notificaciones denegado. Actívalo desde la configuración del navegador/dispositivo."
        : "Permiso de notificaciones no otorgado."
    );
  }

  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidKey) {
    throw new Error("VITE_VAPID_PUBLIC_KEY no está configurada en el frontend.");
  }

  const registration = await obtenerRegistration();
  let pushSub = await registration.pushManager.getSubscription();
  if (!pushSub) {
    pushSub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Sesión no válida");

  const body = {
    subscription: {
      endpoint: pushSub.endpoint,
      keys: {
        p256dh: pushSub.toJSON().keys?.p256dh || "",
        auth: pushSub.toJSON().keys?.auth || "",
      },
    },
    dispositivo: dispositivo || navigator.userAgent,
  };

  const res = await fetch(`${URL}/push/suscripcion`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Error guardando la suscripción push");
  }

  const data = await res.json();
  return { suscripcion: data.suscripcion, permiso };
}

/** Desuscribe el dispositivo del backend (y de Web Push si se indica). */
export async function desuscribirPush(
  endpoint: string,
  desuscribirDelNavegador = false
): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (token) {
    await fetch(`${URL}/push/suscripcion`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ endpoint }),
    }).catch(() => {});
  }

  if (desuscribirDelNavegador && "serviceWorker" in navigator) {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
  }
}

/** Lista los dispositivos suscritos del usuario autenticado. */
export async function listarSuscripciones(): Promise<SuscripcionGuardada[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Sesión no válida");

  const res = await fetch(`${URL}/push/suscripciones`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Error listando suscripciones push");
  return res.json();
}

/** Envía una notificación de prueba a este usuario (verificación end-to-end). */
export async function enviarPushDePruebaFront(): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Sesión no válida");

  const res = await fetch(`${URL}/push/test`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Error enviando notificación de prueba");
  }
}
