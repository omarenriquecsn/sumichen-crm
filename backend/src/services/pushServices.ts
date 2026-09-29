import webpush from 'web-push';
import { createECDH } from 'crypto';
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

// Resultado del chequeo del par VAPID al arrancar (ver `verificarParVapid`).
// Se usa para decidir si un 401/403 es una suscripción muerta (par válido) o un
// problema global de configuración (no borrar nada).
let vapidParValido = false;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  verificarParVapid(vapidPublicKey, vapidPrivateKey);
} else {
  console.warn(
    '⚠ VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY no configuradas: el envío de notificaciones push (PWA) está deshabilitado.'
  );
}

/**
 * Comprueba que la clave pública VAPID corresponda a la privada. Si no
 * coinciden, webpush firma con una clave distinta a la que usan las
 * suscripciones y TODOS los envíos fallan con 401/403.
 */
function verificarParVapid(publicKey: string, privateKey: string) {
  try {
    const decodificar = (b64url: string) =>
      Buffer.from(b64url.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

    const ecdh = createECDH('prime256v1');
    ecdh.setPrivateKey(decodificar(privateKey));
    const publicaDerivada = ecdh.getPublicKey(); // 65 bytes sin comprimir

    if (!publicaDerivada.equals(decodificar(publicKey))) {
      vapidParValido = false;
      console.error(
        '❌ VAPID: la clave pública NO corresponde a la privada. Los push fallarán con 401/403. ' +
          'Regenera el par (scripts/generarVapid.js), actualiza backend/.env y project/.env, ' +
          'y haz que los usuarios vuelvan a activar las notificaciones.'
      );
    } else {
      vapidParValido = true;
      console.log('✅ VAPID: par de claves válido.');
    }
  } catch (error) {
    vapidParValido = false;
    console.error('❌ VAPID: no se pudo validar el par de claves:', error);
  }
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

interface ResultadoEnvio {
  ok: boolean;
  endpoint: string;
  statusCode?: number;
  /** El fallo indica que la suscripción es inservible y debe eliminarse. */
  borrar: boolean;
  /** Fallo 401/403 (posible problema global de VAPID). */
  vapid: boolean;
}

/** Host del endpoint push, para logs legibles sin exponer la URL completa. */
const hostDelEndpoint = (endpoint: string) => {
  try {
    return new URL(endpoint).host;
  } catch {
    return 'endpoint-desconocido';
  }
};

const enviarASuscripcion = async (
  sub: Subscription,
  payload: PushPayload,
): Promise<ResultadoEnvio> => {
  try {
    await webpush.sendNotification(sub, aPayloadSW(payload));
    return { ok: true, endpoint: sub.endpoint, borrar: false, vapid: false };
  } catch (error: any) {
    const statusCode: number | undefined = error?.statusCode;
    // 404/410 = suscripción inválida/eliminada.
    // 401/403 = VAPID inválido o suscripción creada con otra clave VAPID.
    // 400     = suscripción malformada (endpoint/keys corruptos).
    const borrar =
      statusCode === 404 ||
      statusCode === 410 ||
      statusCode === 401 ||
      statusCode === 403 ||
      statusCode === 400;
    const vapid = statusCode === 401 || statusCode === 403;

    if (borrar) {
      console.warn(
        `⚠ Push rechazado (HTTP ${statusCode}) por ${hostDelEndpoint(sub.endpoint)}; ` +
          `se limpiará salvo que el fallo sea global.`,
      );
    } else {
      console.error('❌ Error enviando push:', statusCode || error);
    }

    return { ok: false, endpoint: sub.endpoint, statusCode, borrar, vapid };
  }
};

/**
 * Procesa los resultados de un envío: cuenta los exitosos y limpia las
 * suscripciones inservibles. Salvaguarda: si el par VAPID del servidor no es
 * válido, un 401/403 puede ser un fallo global y NO se borran esas
 * suscripciones (evita vaciar la tabla por una mala configuración).
 */
const procesarResultados = async (resultados: ResultadoEnvio[]): Promise<number> => {
  const total = resultados.length;
  if (total === 0) return 0;

  const enviadas = resultados.filter((r) => r.ok).length;
  const fallidas = resultados.filter((r) => !r.ok && r.borrar);
  const fallidasVapid = fallidas.filter((r) => r.vapid);
  const hayFalloVapid = fallidasVapid.length > 0;

  if (hayFalloVapid && !vapidParValido) {
    console.error(
      `🚨 Fallo VAPID (401/403) con el par de claves inválido: NO se eliminan las ` +
        `${fallidasVapid.length} suscripciones afectadas. Revisa VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY.`,
    );
  }

  // Se eliminan las inservibles, excepto las VAPID si el par del servidor es dudoso.
  const aEliminar = fallidas.filter((r) => !(r.vapid && !vapidParValido));
  await Promise.all(
    aEliminar.map((r) => eliminarSuscripcionRepository(r.endpoint).catch(() => {})),
  );

  return enviadas;
};

export const guardarSuscripcion = (data: {
  vendedor_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  dispositivo?: string;
}) => guardarSuscripcionRepository(data);

export const eliminarSuscripcion = (endpoint: string, vendedorId?: string) =>
  eliminarSuscripcionRepository(endpoint, vendedorId);

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
  return await procesarResultados(resultados);
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
  return await procesarResultados(resultados);
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
  return await procesarResultados(resultados);
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
  const enviadas = await procesarResultados(resultados);
  return {
    enviadas,
    total: destinatarios.length,
  };
};
