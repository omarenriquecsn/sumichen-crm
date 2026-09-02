import {
  getLeadByTelefono,
  createLead,
  updateLead,
} from '../repositories/leadsRepository';
import {
  getConversacionByLeadId,
  createConversacion,
  updateConversacion,
} from '../repositories/conversacionesRepository';
import { createMensaje, mensajeExistePorWamid } from '../repositories/mensajesRepository';
import { ApiError } from '../utils/ApiError';
import { EstadoLeadEnum, CanalEntradaEnum, OrigenLeadEnum } from '../entities/Lead';
import { EstadoConversacionEnum, CanalConversacionEnum } from '../entities/Conversacion';
import { RemitenteTipoEnum, TipoMensajeEnum } from '../entities/Mensaje';
import { procesarAsistente } from './asistenteMenuServices';
import { enviarPushAUsuario, enviarPushAAdmins } from './pushServices';
import { EventoNotificacionEnum } from '../enums/EventoNotificacionEnum';
import { esUsuarioEquipoPorTelefono } from '../repositories/usuariosRepository';
import { resolverUtilidad, enviarUtilidadPorWhatsApp } from '../utils/utilidadesWhatsapp';

/**
 * Fase 2 — Webhook entrante de WhatsApp (Meta Cloud API).
 *
 * Verificación de suscripción: Meta hace GET al callback con
 * `hub.mode=subscribe&hub.verify_token=X&hub.challenge=Y`; si verify_token
 * coincide con META_VERIFY_TOKEN se responde con el challenge.
 */
export const verificarWebhookWhatsApp = (query: Record<string, any>): string => {
  const mode = query['hub.mode'];
  const verifyToken = query['hub.verify_token'];
  const challenge = query['hub.challenge'];

  const esperado = process.env.META_VERIFY_TOKEN;
  if (!esperado) throw new ApiError('META_VERIFY_TOKEN no configurado', 500);
  if (mode !== 'subscribe' || verifyToken !== esperado) {
    throw new ApiError('Token de verificación inválido', 403);
  }
  return challenge as string;
};

/**
 * Procesa el payload de un webhook de Meta Cloud API y crea/actualiza el lead
 * y la conversación según el número de teléfono del remitente.
 *
 * Estructura del payload (Meta Cloud API):
 * {
 *   object: 'whatsapp_business_account',
 *   entry: [{ changes: [{
 *     value: {
 *       contacts: [{ profile: { name }, wa_id }],
 *       messages: [{ from, id, timestamp, type, text: { body } }],
 *       metadata: { phone_number_id, display_phone_number }
 *     }
 *   }] }]
 * }
 */
export const procesarWebhookWhatsApp = async (payload: any) => {
  const resultados: any[] = [];
  if (!payload?.entry?.length) return resultados;

  for (const entry of payload.entry) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      if (!value.messages) continue; // solo nos interesan mensajes entrantes

      for (const msg of value.messages) {
        try {
          resultados.push(await procesarMensajeWhatsApp(msg, value, payload));
        } catch (err) {
          resultados.push({
            wamid: msg.id,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }
  }
  return resultados;
};

const procesarMensajeWhatsApp = async (msg: any, value: any, _payload: any) => {
  const wamid = msg.id;
  const telefono = msg.from;
  const contacto = (value.contacts || []).find((c: any) => c.wa_id === telefono);
  const nombre = contacto?.profile?.name || 'Cliente WhatsApp';
  const cuerpo = msg.text?.body?.trim() || `[mensaje ${msg.type || 'no-texto'}]`;

  // Ignorar mensajes ya procesados (Meta re-envía el mismo webhook varias veces)
  if (wamid && (await mensajeExistePorWamid(wamid))) {
    return { wamid, accion: 'duplicado_ignorado' };
  }

  // ⚠ Equipo de ventas: los mensajes de números pertenecientes a un vendedor o
  // admin activo (teléfono del perfil) NO generan leads. Si el mensaje contiene
  // una palabra clave de utilidades ("horario", "condiciones de despacho") se
  // envía la imagen directamente; cualquier otro mensaje del equipo se ignora.
  if (await esUsuarioEquipoPorTelefono(telefono)) {
    const utilidad = resolverUtilidad(cuerpo);
    if (utilidad) {
      await enviarUtilidadPorWhatsApp(telefono, utilidad, value.metadata?.phone_number_id);
      return {
        wamid,
        accion: 'documento_utilidad_enviado',
        palabra_clave: utilidad.palabrasClave[0],
        archivo: utilidad.archivo,
      };
    }
    return { wamid, accion: 'interno_ignorado' };
  }

  let lead = await getLeadByTelefono(telefono);

  // Dedupe global: si el wamid ya se procesó (en mensajes o en metadata del
  // lead), ignorar. Meta puede reenviar el mismo webhook varias veces.
  const wamidsLead: string[] = (lead?.metadata?.wamids || []) as string[];
  const yaProcesado = lead?.metadata?.wamid === wamid || wamidsLead.includes(wamid);
  if (wamid && ((await mensajeExistePorWamid(wamid)) || yaProcesado)) {
    return { wamid, accion: 'duplicado_ignorado' };
  }

  // ⚠ Lead perdido que vuelve a escribir: se reactiva. Con vendedor → vuelve a
  // 'contactado' y el mensaje cae en su conversación; sin vendedor → vuelve a
  // 'nuevo' y se reinicia el asistente de bienvenida (pregunta estado otra vez).
  if (lead && lead.estado === EstadoLeadEnum.PERDIDO) {
    if (lead.vendedor_asignado_id) {
      lead = await updateLead(lead.id, { estado: EstadoLeadEnum.CONTACTADO, ultima_actividad_en: new Date() });
    } else {
      const metadata = { ...lead.metadata };
      delete metadata.paso_menu;
      delete metadata.estados_disponibles;
      delete metadata.intencion_seleccionada;
      delete metadata.tipo_contacto;
      lead = await updateLead(lead.id, {
        estado: EstadoLeadEnum.NUEVO,
        ultima_actividad_en: new Date(),
        metadata,
      });
    }
  }

  if (!lead) {
    // Nuevo lead desde WhatsApp
    lead = await createLead({
      origen: OrigenLeadEnum.WHATSAPP,
      tipo_web: null,
      canal_entrada: CanalEntradaEnum.WHATSAPP_MENSAJE,
      estado: EstadoLeadEnum.NUEVO,
      datos_contacto: {
        nombre,
        telefono,
        mensaje_inicial: cuerpo,
      },
      metadata: {
        wamid,
        wamids: [wamid],
        phone_number_id: value.metadata?.phone_number_id,
        display_phone_number: value.metadata?.display_phone_number,
        mensajes_pendientes: [cuerpo],
      },
      ultima_actividad_en: new Date(),
    });

    // Asistente de bienvenida: primer contacto → envía menú de estados.
    await procesarAsistente(lead.id, cuerpo);

    // Web Push — evento `lead_nuevo_sin_asignar`: avisa a los admins de que
    // llegó un lead que aún nadie atiende.
    try {
      await enviarPushAAdmins(
        {
          titulo: '🔔 Nuevo lead de WhatsApp',
          cuerpo: `${nombre} escribió: "${cuerpo.slice(0, 80)}". Pendiente de asignar.`,
          url: '#/leads',
        },
        EventoNotificacionEnum.LEAD_NUEVO_SIN_ASIGNAR,
      );
    } catch (err) {
      console.error('No se pudo enviar push de nuevo lead sin asignar:', err);
    }

    return { wamid, leadId: lead.id, accion: 'lead_creado', nombre, telefono, mensaje: cuerpo };
  }

  // Lead existente
  const nuevoMetadata = { ...lead.metadata, wamids: [...wamidsLead, wamid] };

  // Si el lead ya tiene vendedor asignado y conversación, guardamos el mensaje ahí
  let conv = await getConversacionByLeadId(lead.id);
  if (lead.vendedor_asignado_id) {
    if (!conv) {
      conv = await createConversacion({
        lead_id: lead.id,
        vendedor_id: lead.vendedor_asignado_id,
        estado: EstadoConversacionEnum.ABIERTA,
        canal: CanalConversacionEnum.WHATSAPP,
        ultimo_mensaje_en: new Date(),
      });
    }
    await updateLead(lead.id, { ultima_actividad_en: new Date(), metadata: nuevoMetadata });
    await createMensaje({
      conversacion_id: conv.id,
      remitente_tipo: RemitenteTipoEnum.LEAD,
      remitente_id: lead.id,
      contenido: cuerpo,
      tipo: TipoMensajeEnum.TEXTO,
      metadata: { wamid, wa_id: telefono },
      detectado_sin_stock: false,
    });
    await updateConversacion(conv.id, { ultimo_mensaje_en: new Date(), estado: EstadoConversacionEnum.ABIERTA });

    // Web Push — evento `mensaje_nuevo`: avisa al vendedor de la conversación.
    if (lead.vendedor_asignado_id) {
      try {
        await enviarPushAUsuario(
          lead.vendedor_asignado_id,
          {
            titulo: `💬 Nuevo mensaje de ${nombre}`,
            cuerpo: cuerpo.slice(0, 120),
            url: `#/chat/${conv.id}`,
          },
          EventoNotificacionEnum.MENSAJE_NUEVO,
        );
      } catch (err) {
        console.error('No se pudo enviar push de mensaje nuevo:', err);
      }
    }

    // Asistente: si el lead está en el paso de intención, la respuesta se
    // captura aquí (el lead ya tiene vendedor asignado).
    await procesarAsistente(lead.id, cuerpo);

    return { wamid, leadId: lead.id, accion: 'mensaje_conversacion', mensaje: cuerpo };
  }

  // Lead sin vendedor asignado: acumular mensaje pendiente para que no se pierda.
  const pendientes: string[] = (lead.metadata?.mensajes_pendientes || []) as string[];
  await updateLead(lead.id, {
    ultima_actividad_en: new Date(),
    metadata: { ...nuevoMetadata, mensajes_pendientes: [...pendientes, cuerpo] },
  });

  // Asistente: procesa la respuesta (estado → zona → asignación, o intención).
  await procesarAsistente(lead.id, cuerpo);

  return { wamid, leadId: lead.id, accion: 'mensaje_pendiente', mensaje: cuerpo };
};
