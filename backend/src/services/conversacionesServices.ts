import {
  getConversaciones,
  getConversacionesParaExport,
  getConversacionById,
  getConversacionByLeadId,
  createConversacion,
  updateConversacion,
  cerrarConversacion,
} from '../repositories/conversacionesRepository';
import { createMensaje, getMensajes, getUltimosMensajes } from '../repositories/mensajesRepository';
import { getLeadById } from '../repositories/leadsRepository';
import { ApiError } from '../utils/ApiError';
import { EstadoConversacionEnum, CanalConversacionEnum } from '../entities/Conversacion';
import { RemitenteTipoEnum, TipoMensajeEnum } from '../entities/Mensaje';
import { enviarPushAUsuario } from './pushServices';
import { EventoNotificacionEnum } from '../enums/EventoNotificacionEnum';

export const getConversacionesService = async (filtros: { vendedor_id?: string; estado?: string }, reqUser?: any) => {
  if (reqUser?.rol === 'vendedor') {
    filtros.vendedor_id = reqUser.vendedor_db_id;
  }
  return await getConversaciones(filtros);
};

export const getConversacionesParaExportService = async () => {
  return await getConversacionesParaExport();
};

export const getConversacionByIdService = async (id: string, reqUser?: any) => {
  const conv = await getConversacionById(id);
  if (!conv) throw new ApiError('Conversación no encontrada', 404);
  if (reqUser?.rol === 'vendedor' && conv.vendedor_id !== reqUser.vendedor_db_id) {
    throw new ApiError('No autorizado', 403);
  }
  return conv;
};

export const getConversacionByLeadIdService = async (leadId: string, reqUser?: any) => {
  const conv = await getConversacionByLeadId(leadId);
  if (!conv) return null;
  if (reqUser?.rol === 'vendedor' && conv.vendedor_id !== reqUser.vendedor_db_id) {
    throw new ApiError('No autorizado', 403);
  }
  return conv;
};

export const abrirConversacionParaLead = async (leadId: string, vendedorId: string, canal: string = 'whatsapp') => {
  const existing = await getConversacionByLeadId(leadId);
  if (existing) return existing;

  const lead = await getLeadById(leadId);
  if (!lead) throw new ApiError('Lead no encontrado', 404);

  const conv = await createConversacion({
    lead_id: leadId,
    vendedor_id: vendedorId,
    estado: EstadoConversacionEnum.ABIERTA,
    canal: canal as any,
    ultimo_mensaje_en: new Date(),
  });

  // Fase 2: si el lead llegó por WhatsApp sin vendedor asignado, sus mensajes
  // quedaron pendientes en metadata.mensajes_pendientes. Al abrir la
  // conversación se siembran para que el vendedor vea todo el historial.
  const pendientes: string[] = (lead.metadata?.mensajes_pendientes || []) as string[];
  if (pendientes.length) {
    for (const contenido of pendientes) {
      await createMensaje({
        conversacion_id: conv.id,
        remitente_tipo: RemitenteTipoEnum.LEAD,
        remitente_id: leadId,
        contenido,
        tipo: TipoMensajeEnum.TEXTO as any,
        metadata: {},
        detectado_sin_stock: false,
      });
    }
    // Limpiar pendientes tras sembrarlos
    const leadRepo = (await import('../config/dataBaseConfig')).AppDataSource.getRepository('leads');
    await leadRepo.update(leadId, { metadata: { ...lead.metadata, mensajes_pendientes: [] } });
  }

  return conv;
};

export const enviarMensajeService = async (
  conversacionId: string,
  remitenteId: string,
  contenido: string,
  tipo: string = 'texto',
  metadata: Record<string, any> = {},
  remitenteTipo: string = 'vendedor',
  reqUser?: any
) => {
  const conv = await getConversacionById(conversacionId);
  if (!conv) throw new ApiError('Conversación no encontrada', 404);
  if (conv.estado === 'cerrada') throw new ApiError('Conversación cerrada', 400);
  // ⚠ Aislamiento de chat: un vendedor solo puede escribir en sus propias
  // conversaciones (igual que getMensajesService).
  if (reqUser?.rol === 'vendedor' && conv.vendedor_id !== reqUser.vendedor_db_id) {
    throw new ApiError('No autorizado', 403);
  }

  const mensaje = await createMensaje({
    conversacion_id: conversacionId,
    remitente_tipo: remitenteTipo as any,
    remitente_id: remitenteId,
    contenido,
    tipo: tipo as any,
    metadata,
    detectado_sin_stock: false, // Fase 3: detección palabras clave
  });

  await updateConversacion(conversacionId, { ultimo_mensaje_en: new Date() });

  // Fase 2 — Envío saliente: cuando el vendedor escribe en una conversación de
  // WhatsApp, además de guardarlo en DB se envía por la API de Meta al número
  // del lead. Se intenta dentro de la ventana de 24h (session window); si falla
  // (p. ej. ventana cerrada) NO se rompe el flujo, solo se registra en metadata.
  if (remitenteTipo === 'vendedor' && conv.canal === CanalConversacionEnum.WHATSAPP) {
    const lead = conv.lead;
    const telefono = lead?.datos_contacto?.telefono;
    if (telefono) {
      try {
        const phoneNumberId = (lead?.metadata as any)?.phone_number_id;
        const { sendWhatsAppText } = await import('../utils/sendWhatsapp');
        const respuesta = await sendWhatsAppText(telefono, contenido, phoneNumberId);
        // Guardar el wamid de salida en metadata del mensaje (para trazabilidad)
        await mensajeRepo().update(mensaje.id, {
          metadata: { ...metadata, wamid_envio: respuesta?.messages?.[0]?.id },
        });
      } catch (err) {
        // No bloquear el envío de la respuesta: solo loguear
        await mensajeRepo().update(mensaje.id, {
          metadata: { ...metadata, error_envio: err instanceof Error ? err.message : String(err) },
        });
      }
    }
  }

  return mensaje;
};

const mensajeRepo = () => {
  const { AppDataSource } = require('../config/dataBaseConfig');
  return AppDataSource.getRepository('mensajes');
};

export const getMensajesService = async (conversacionId: string, page = 1, limit = 50, reqUser?: any) => {
  const conv = await getConversacionById(conversacionId);
  if (!conv) throw new ApiError('Conversación no encontrada', 404);
  if (reqUser?.rol === 'vendedor' && conv.vendedor_id !== reqUser.vendedor_db_id) {
    throw new ApiError('No autorizado', 403);
  }
  return await getMensajes(conversacionId, page, limit);
};

export const recibirMensajeExternoService = async (
  leadId: string,
  contenido: string,
  tipo: string = 'texto',
  metadata: Record<string, any> = {}
) => {
  const lead = await getLeadById(leadId);
  if (!lead) throw new ApiError('Lead no encontrado', 404);
  if (!lead.vendedor_asignado_id) throw new ApiError('Lead sin vendedor asignado', 400);

  let conv = await getConversacionByLeadId(leadId);
  if (!conv) {
    conv = await createConversacion({
      lead_id: leadId,
      vendedor_id: lead.vendedor_asignado_id,
      estado: EstadoConversacionEnum.ABIERTA,
      canal: CanalConversacionEnum.WHATSAPP,
      ultimo_mensaje_en: new Date(),
    });
  }

  const mensaje = await createMensaje({
    conversacion_id: conv.id,
    remitente_tipo: RemitenteTipoEnum.LEAD,
    remitente_id: leadId,
    contenido,
    tipo: tipo as any,
    metadata,
    detectado_sin_stock: false,
  });

  await updateConversacion(conv.id, { ultimo_mensaje_en: new Date() });
  await updateConversacion(conv.id, { estado: EstadoConversacionEnum.ABIERTA });

  // Web Push — evento `mensaje_nuevo`: avisa al vendedor de la conversación.
  if (conv.vendedor_id) {
    try {
      const nombre = lead.datos_contacto?.nombre || 'el cliente';
      await enviarPushAUsuario(
        conv.vendedor_id,
        {
          titulo: `💬 Nuevo mensaje de ${nombre}`,
          cuerpo: contenido.slice(0, 120),
          url: `#/chat/${conv.id}`,
        },
        EventoNotificacionEnum.MENSAJE_NUEVO,
      );
    } catch (err) {
      console.error('No se pudo enviar push de mensaje nuevo:', err);
    }
  }

  // Actualizar última actividad del lead
  const leadRepo = (await import('../config/dataBaseConfig')).AppDataSource.getRepository('leads');
  await leadRepo.update(leadId, { ultima_actividad_en: new Date() });

  return { mensaje, conversacion: conv };
};

export const cerrarConversacionService = async (id: string, reqUser?: any) => {
  const conv = await getConversacionById(id);
  if (!conv) throw new ApiError('Conversación no encontrada', 404);
  if (reqUser?.rol === 'vendedor' && conv.vendedor_id !== reqUser.vendedor_db_id) {
    throw new ApiError('No autorizado', 403);
  }
  return await cerrarConversacion(id);
};