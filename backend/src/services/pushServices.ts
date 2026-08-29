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
import {
  obtenerPreferenciasDeVendedoresRepository,
  eventoHabilitadoRepository,
} from '../repositories/preferenciasNotificacionRepository';

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
 * Si se indica un `evento`, se respeta la preferencia del usuario
 * (tabla preferencias_notificaciones); sin evento (ej. prueba) siempre se envía.
 */
export const enviarPushAUsuario = async (
  vendedorDbId: string,
  payload: PushPayload,
  evento?: string,
) => {
  if (!vendedorDbId) return 0;
  if (evento && !(await eventoHabilitadoRepository(vendedorDbId, evento))) return 0;

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
 * Respeta las preferencias por evento de cada admin (solo se notifica a quien
 * tiene el evento habilitado).
 */
export const enviarPushAAdmins = async (payload: PushPayload, evento?: string) => {
  const admins = await AppDataSource.getRepository(Vendedor).findBy({ rol: RolesEnum.ADMIN });
  if (!admins.length) return 0;

  // Filtrar admins que tengan el evento deshabilitado.
  let adminsDestino = admins;
  if (evento) {
    const prefs = await obtenerPreferenciasDeVendedoresRepository(admins.map((a) => a.id));
    const deshabilitados = new Set(
      prefs.filter((p) => p.evento === evento && !p.habilitado).map((p) => p.vendedor_id)
    );
    adminsDestino = admins.filter((a) => !deshabilitados.has(a.id));
    if (!adminsDestino.length) return 0;
  }

  const subs = await obtenerSuscripcionesPorVendedoresRepository(
    adminsDestino.map((a) => a.id)
  );
  if (!subs.length) return 0;

  const resultados = await Promise.all(
    subs.map((s) =>
      enviarASuscripcion({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)
    )
  );
  return resultados.filter(Boolean).length;
};

/**
 * Envía una notificación push a TODOS los vendedores activos (admins y
 * vendedores). Respeta las preferencias por evento de cada uno. Útil para
 * avisos globales (ej. inventario de productos actualizado).
 */
export const enviarPushATodos = async (payload: PushPayload, evento?: string) => {
  const vendedores = await AppDataSource.getRepository(Vendedor).find({ where: { activo: true } });
  if (!vendedores.length) return 0;

  let vendedoresDestino = vendedores;
  if (evento) {
    const prefs = await obtenerPreferenciasDeVendedoresRepository(vendedores.map((v) => v.id));
    const deshabilitados = new Set(
      prefs.filter((p) => p.evento === evento && !p.habilitado).map((p) => p.vendedor_id)
    );
    vendedoresDestino = vendedores.filter((v) => !deshabilitados.has(v.id));
    if (!vendedoresDestino.length) return 0;
  }

  const subs = await obtenerSuscripcionesPorVendedoresRepository(
    vendedoresDestino.map((v) => v.id)
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

export interface EnviarLlamadaParams {
  telefono: string;
  nombre?: string;
  clienteId: string;
  endpointOrigen?: string;
}

/**
 * Envía una notificación push a los dispositivos del vendedor (excluyendo el
 * dispositivo que origina la acción) para que el usuario pueda llamar desde
 * su móvil: al tocar la notificación, la app abre `#/clientes/:id?accion=llamar`.
 */
export const enviarLlamadaAlMovil = async (
  vendedorDbId: string,
  params: EnviarLlamadaParams,
): Promise<{ enviadas: number; total: number }> => {
  if (!vendedorDbId) return { enviadas: 0, total: 0 };

  const telefono = params.telefono.replace(/\D/g, '');
  if (!telefono) return { enviadas: 0, total: 0 };

  const subs = await obtenerSuscripcionesPorVendedorRepository(vendedorDbId);
  const destinatarios = subs.filter((s) => s.endpoint !== params.endpointOrigen);
  if (!destinatarios.length) return { enviadas: 0, total: subs.length };

  const nombre = params.nombre || 'el cliente';
  const url = `./#/clientes/${params.clienteId}?accion=llamar&telefono=${telefono}`;

  const resultados = await Promise.all(
    destinatarios.map((s) =>
      enviarASuscripcion(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        {
          titulo: `📞 Llamar a ${nombre}`,
          cuerpo: telefono,
          url,
          tag: `llamar-${params.clienteId}-${Date.now()}`,
        },
      ),
    ),
  );
  return {
    enviadas: resultados.filter(Boolean).length,
    total: destinatarios.length,
  };
};
