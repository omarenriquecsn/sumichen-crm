import {
  asignarLeadAutomatico,
  asignarLeadAVendedor,
  getLeadById,
  updateLead,
} from '../repositories/leadsRepository';
import { abrirConversacionParaLead } from './conversacionesServices';
import { enviarPushAAdmins, enviarPushAUsuario } from './pushServices';
import { EventoNotificacionEnum } from '../enums/EventoNotificacionEnum';
import { construirUrlAtenderLead } from '../utils/atenderLead';
import { getPartesFechaLocal } from '../utils/finSemana';
import { EstadoLeadEnum, TipoWebEnum } from '../entities/Lead';

/**
 * Asigna un lead que quedó retenido por el asistente fuera de horario
 * (`metadata.paso_menu = 'fuera_horario'`).
 *
 * - Cliente: usa la zona guardada (`zona_id_pendiente`) y asigna al vendedor
 *   con menor carga de esa zona.
 * - Proveedor / trabajo: asigna al usuario configurado
 *   (`vendedor_destino_id`).
 *
 * Abre la conversación y avisa al vendedor por push. NO envía otro WhatsApp al
 * cliente (el cliente ya recibió el mensaje de horario la noche anterior).
 */
export const asignarLeadRetenido = async (leadId: string) => {
  const lead = await getLeadById(leadId);
  if (!lead || lead.estado !== EstadoLeadEnum.NUEVO || lead.vendedor_asignado_id) {
    return null;
  }

  const meta: Record<string, any> = (lead.metadata || {}) as Record<string, any>;
  if (meta.paso_menu !== 'fuera_horario') return null;

  const nombre = lead.datos_contacto?.nombre || 'el cliente';
  const tipo = meta.tipo_contacto;
  let asignado: any = null;
  let vendedorId: string | null = null;

  if (tipo === 'proveedor' || tipo === 'trabajo') {
    vendedorId = meta.vendedor_destino_id || null;
    if (!vendedorId) {
      await avisarAdminsUnaVez(lead, nombre, 'no tiene usuario configurado para ese tipo de contacto');
      return null;
    }
    asignado = await asignarLeadAVendedor(lead.id, vendedorId);
    if (!asignado) return null;

    await abrirConversacionParaLead(lead.id, vendedorId, 'whatsapp');
    try {
      await enviarPushAUsuario(
        vendedorId,
        {
          titulo:
            tipo === 'proveedor' ? '🤝 Nuevo proveedor pendiente' : '💼 Nuevo postulante pendiente',
          cuerpo: `${nombre} se identificó como ${tipo === 'proveedor' ? 'proveedor' : 'postulante'} y quedó pendiente de tu atención.`,
          url: construirUrlAtenderLead(asignado),
        },
        EventoNotificacionEnum.LEAD_ASIGNADO,
      );
    } catch (err) {
      console.error(
        '[Retenidos] No se pudo enviar push de tipo especial:',
        err instanceof Error ? err.message : err,
      );
    }
  } else {
    const zonaId: string | null = meta.zona_id_pendiente || null;
    if (!zonaId) {
      await avisarAdminsUnaVez(lead, nombre, 'no tiene zona guardada (no respondió el estado)');
      return null;
    }

    asignado = await asignarLeadAutomatico(lead.id, zonaId);
    vendedorId = asignado?.vendedor_asignado_id || null;
    if (!asignado || !vendedorId) {
      await avisarAdminsUnaVez(lead, nombre, 'no hay vendedores disponibles en su zona');
      return null;
    }

    await abrirConversacionParaLead(lead.id, vendedorId, 'whatsapp');
    try {
      await enviarPushAUsuario(
        vendedorId,
        {
          titulo: '🔔 Nuevo lead asignado',
          cuerpo: `${nombre} fue asignado a ti. Tienes hasta el próximo día hábil para atenderlo.`,
          url: construirUrlAtenderLead(asignado),
        },
        EventoNotificacionEnum.LEAD_ASIGNADO,
      );
    } catch (err) {
      console.error(
        '[Retenidos] No se pudo enviar push de lead asignado:',
        err instanceof Error ? err.message : err,
      );
    }
  }

  await updateLead(lead.id, {
    ...(tipo === 'proveedor' || tipo === 'trabajo'
      ? {
          tipo_web: (tipo === 'proveedor'
            ? TipoWebEnum.PROVEEDOR
            : TipoWebEnum.TRABAJO) as any,
        }
      : {}),
    metadata: {
      ...(asignado?.metadata || meta),
      paso_menu: 'completado',
      retenido_asignado_en: new Date().toISOString(),
      zona_id_pendiente: null,
      vendedor_destino_id: null,
    },
  });

  return asignado;
};

/** Avisa a los admins como máximo una vez por día por lead. */
const avisarAdminsUnaVez = async (lead: any, nombre: string, motivo: string) => {
  const hoy = getPartesFechaLocal().ymd;
  const meta: Record<string, any> = { ...((lead.metadata || {}) as Record<string, any>) };
  if (meta.retenido_aviso === hoy) return;

  try {
    await enviarPushAAdmins(
      {
        titulo: '⚠️ Lead retenido sin asignar',
        cuerpo: `${nombre} quedó retenido fuera de horario y ${motivo}. Asígnalo manualmente.`,
        url: '#/leads',
      },
      EventoNotificacionEnum.LEAD_NUEVO_SIN_ASIGNAR,
    );
  } catch (err) {
    console.error(
      '[Retenidos] No se pudo avisar a los admins:',
      err instanceof Error ? err.message : err,
    );
  }

  try {
    await updateLead(lead.id, { metadata: { ...meta, retenido_aviso: hoy } });
  } catch (err) {
    console.error(
      '[Retenidos] No se pudo guardar la marca de aviso:',
      err instanceof Error ? err.message : err,
    );
  }
};
