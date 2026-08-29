import webpush from 'web-push';
import { AppDataSource } from '../config/dataBaseConfig';
import { Vendedor } from '../entities/Vendedores';
import { RolesEnum } from '../enums/RolesEnum';
import {
  eliminarSuscripcionRepository,
  obtenerSuscripcionesPorVendedorRepository,
  obtenerSuscripcionesPorVendedoresRepository,
  guardarSuscripcionRepository,
} from '../repositories/pushSuscripcionRepository';

// Inicializa VAPID (las llaves se cargan desde .env vía dotenv en dataBaseConfig).
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@crmsumichen.com';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
} else {
  console.warn(
    '⚠ VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY no configuradas: el envío de notificaciones push (PWA) está deshabilitado.'
  );
}

export interface PushPayload {
  titulo: string;
  cuerpo?: string;
  url?: string;
  tag?: string;
  silent?: boolean;
}

interface Subscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/**
 * Convierte el payload de negocio al formato que espera el service worker.
 */
const aPayloadSW = (payload: PushPayload) =>
  JSON.stringify({
    title: payload.titulo,
    body: payload.cuerpo || '',
    url: payload.url || './',
    tag: payload.tag || 'sumichem-crm',
    silent: payload.silent || false,
  });

const enviarASuscripcion = async (sub: Subscription, payload: PushPayload) => {
  try {
    await webpush.sendNotification(sub, aPayloadSW(payload));
    return true;
  } catch (error: any) {
    // 404/410 = suscripción inválida/eliminada: limpiarla.
    if (error?.statusCode === 404 || error?.statusCode === 410) {
      await eliminarSuscripcionRepository(sub.endpoint).catch(() => {});
    } else {
      console.error('❌ Error enviando push:', error?.statusCode || error);
    }
    return false;
  }
};

export const guardarSuscripcion = (data: {
  vendedor_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  dispositivo?: string;
}) => guardarSuscripcionRepository(data);

export const eliminarSuscripcion = (endpoint: string) =>
  eliminarSuscripcionRepository(endpoint);

export const obtenerSuscripciones = (vendedorDbId: string) =>
  obtenerSuscripcionesPorVendedorRepository(vendedorDbId);

/**
 * Envía una notificación push a TODOS los dispositivos de un vendedor.
 * Listo para cablear eventos de negocio (pedidos, mensajes, leads, SLA, etc.).
 */
export const enviarPushAUsuario = async (vendedorDbId: string, payload: PushPayload) => {
  if (!vendedorDbId) return 0;
  const subs = await obtenerSuscripcionesPorVendedorRepository(vendedorDbId);
  if (!subs.length) return 0;

  const resultados = await Promise.all(
    subs.map((s) =>
      enviarASuscripcion({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)
    )
  );
  return resultados.filter(Boolean).length;
};

/**
 * Envía una notificación push a todos los usuarios con rol 'admin'.
 */
export const enviarPushAAdmins = async (payload: PushPayload) => {
  const admins = await AppDataSource.getRepository(Vendedor).findBy({ rol: RolesEnum.ADMIN });
  if (!admins.length) return 0;

  const subs = await obtenerSuscripcionesPorVendedoresRepository(
    admins.map((a) => a.id)
  );
  if (!subs.length) return 0;

  const resultados = await Promise.all(
    subs.map((s) =>
      enviarASuscripcion({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)
    )
  );
  return resultados.filter(Boolean).length;
};

/** Notificación de prueba para verificar el flujo de punta a punta. */
export const enviarPushDePrueba = (vendedorDbId: string) =>
  enviarPushAUsuario(vendedorDbId, {
    titulo: '🔔 Sumichem CRM',
    cuerpo: '¡Notificación de prueba! Si ves esto, las notificaciones están activas en este dispositivo.',
    url: './',
    tag: `test-${Date.now()}`,
  });
