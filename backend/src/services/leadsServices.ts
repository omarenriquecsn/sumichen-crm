import {
  getLeads,
  getLeadById,
  getLeadsParaExport,
  createLead,
  updateLead,
  asignarLeadAutomatico,
  reasignarLead,
  convertirLeadACliente,
  marcarLeadPerdido,
  getVendedoresDeZona,
  getLeadsSLAVencido,
} from '../repositories/leadsRepository';
import { ApiError } from '../utils/ApiError';
import { In } from 'typeorm';
import { EstadoLeadEnum, TipoWebEnum, CanalEntradaEnum } from '../entities/Lead';
import { Vendedor } from '../entities/Vendedores';
import { enviarPushAUsuario, enviarPushAAdmins } from './pushServices';
import { EventoNotificacionEnum } from '../enums/EventoNotificacionEnum';

export const getLeadsService = async (filtros: any, reqUser?: any) => {
  // Si es vendedor, forzar filtro por su id de tabla (vendedor_db_id),
  // porque lead.vendedor_asignado_id es FK al id de la tabla vendedores.
  if (reqUser?.rol === 'vendedor') {
    filtros.vendedor_id = reqUser.vendedor_db_id;
  }
  return await getLeads(filtros);
};

export const getLeadsParaExportService = async () => {
  return await getLeadsParaExport();
};

export const getLeadByIdService = async (id: string, reqUser?: any) => {
  const lead = await getLeadById(id);
  if (!lead) throw new ApiError('Lead no encontrado', 404);
  // Vendedor solo ve sus leads (comparar contra id de tabla)
  if (reqUser?.rol === 'vendedor' && lead.vendedor_asignado_id !== reqUser.vendedor_db_id) {
    throw new ApiError('No autorizado', 403);
  }
  return lead;
};

export const createLeadWebService = async (data: {
  origen: string;
  tipo_web: string;
  datos_contacto: { nombre: string; telefono: string; email?: string; instagram_handle?: string; mensaje_inicial: string };
  metadata?: Record<string, any>;
}) => {
  if (!data.origen || !['instagram', 'web'].includes(data.origen)) {
    throw new ApiError('Origen inválido', 400);
  }
  if (data.origen === 'web' && !data.tipo_web) {
    throw new ApiError('tipo_web es obligatorio para leads web', 400);
  }
  if (!data.datos_contacto?.nombre || !data.datos_contacto?.telefono || !data.datos_contacto?.mensaje_inicial) {
    throw new ApiError('nombre, telefono y mensaje_inicial son obligatorios', 400);
  }

  const canal = data.origen === 'instagram' ? CanalEntradaEnum.INSTAGRAM_BOTON : CanalEntradaEnum.WEB_FORMULARIO;

  const lead = await createLead({
    origen: data.origen as any,
    tipo_web: data.tipo_web as any,
    canal_entrada: canal,
    estado: EstadoLeadEnum.NUEVO,
    datos_contacto: data.datos_contacto,
    metadata: data.metadata || {},
  });

  return lead;
};

export const asignarLeadService = async (leadId: string, zonaId: string, reqUser?: any) => {
  // Solo admin puede asignar manualmente
  if (reqUser?.rol !== 'admin') throw new ApiError('Solo administradores pueden asignar leads', 403);

  const lead = await getLeadByIdService(leadId);
  if (lead.estado !== EstadoLeadEnum.NUEVO && lead.estado !== EstadoLeadEnum.REASIGNADO) {
    throw new ApiError('Solo se pueden asignar leads nuevos o reasignados', 400);
  }

  const asignado = await asignarLeadAutomatico(leadId, zonaId);
  if (!asignado) {
    throw new ApiError('No hay vendedores disponibles en esa zona', 400);
  }

  // Web Push — evento `lead_asignado`: se avisa al vendedor del SLA de 12h.
  if (asignado.vendedor_asignado_id) {
    try {
      const nombre = asignado.datos_contacto?.nombre || 'el cliente';
      await enviarPushAUsuario(
        asignado.vendedor_asignado_id,
        {
          titulo: '🔔 Nuevo lead asignado',
          cuerpo: `${nombre} fue asignado a ti. Dispones de 12 horas para atenderlo.`,
          url: '#/chat',
        },
        EventoNotificacionEnum.LEAD_ASIGNADO,
      );
    } catch (error) {
      console.error('No se pudo enviar push de lead asignado:', error);
    }
  }

  return asignado;
};

export const reasignarLeadService = async (leadId: string, nuevoVendedorId: string | null, motivo: string, reqUser?: any) => {
  if (reqUser?.rol !== 'admin') throw new ApiError('Solo administradores pueden reasignar', 403);
  const lead = await getLeadByIdService(leadId);
  const anteriorId = lead.vendedor_asignado_id;

  // Validar que el nuevo vendedor esté en la misma zona (si hay zona)
  if (nuevoVendedorId && lead.zona_id) {
    const vendedoresZona = await getVendedoresDeZona(lead.zona_id);
    if (!vendedoresZona.find((v) => v.id === nuevoVendedorId)) {
      throw new ApiError('El vendedor no pertenece a la zona del lead', 400);
    }
  }

  const reasignado = await reasignarLead(leadId, nuevoVendedorId, motivo);

  // Web Push — evento `lead_reasignado`: se avisa al nuevo vendedor.
  if (reasignado?.vendedor_asignado_id) {
    try {
      const nombre = reasignado.datos_contacto?.nombre || 'el cliente';
      await enviarPushAUsuario(
        reasignado.vendedor_asignado_id,
        {
          titulo: '🔄 Lead reasignado a ti',
          cuerpo: `${nombre} fue reasignado a ti. Dispones de 12 horas para atenderlo.`,
          url: '#/chat',
        },
        EventoNotificacionEnum.LEAD_REASIGNADO,
      );
    } catch (error) {
      console.error('No se pudo enviar push de lead reasignado:', error);
    }
  }

  return reasignado;
};

export const convertirLeadService = async (leadId: string, reqUser?: any, datos?: any) => {
  if (reqUser?.rol !== 'admin' && reqUser?.rol !== 'vendedor') throw new ApiError('No autorizado', 403);
  const lead = await getLeadByIdService(leadId);
  if (lead.estado === EstadoLeadEnum.CONVERTIDO) throw new ApiError('Lead ya convertido', 400);
  if (!lead.vendedor_asignado_id && reqUser?.rol === 'vendedor') {
    throw new ApiError('Lead no tiene vendedor asignado', 400);
  }
  if (reqUser?.rol === 'vendedor' && lead.vendedor_asignado_id !== reqUser.vendedor_db_id) {
    throw new ApiError('No es tu lead', 403);
  }
  // Si el lead no tiene vendedor (conversión manual de un admin), el cliente
  // debe quedar asociado a alguien: se usa el vendedor del body, o el admin.
  let vendedorId = datos?.vendedor_id || lead.vendedor_asignado_id;
  if (!vendedorId) vendedorId = reqUser?.vendedor_db_id || null;
  if (!vendedorId) throw new ApiError('El lead no tiene vendedor asignado; asigna uno antes de convertir', 400);

  const convertido = await convertirLeadACliente(leadId, { ...datos, vendedor_id: vendedorId });

  // Web Push — evento `lead_convertido`: se notifica al vendedor y a los admins.
  try {
    const nombre = lead.datos_contacto?.nombre || 'el cliente';
    const cuerpo = `${nombre} se convirtió en cliente.`;
    if (vendedorId) {
      await enviarPushAUsuario(
        vendedorId,
        { titulo: '🎉 Lead convertido a cliente', cuerpo, url: '#/clientes' },
        EventoNotificacionEnum.LEAD_CONVERTIDO,
      );
    }
    await enviarPushAAdmins(
      { titulo: '🎉 Lead convertido a cliente', cuerpo, url: '#/clientes' },
      EventoNotificacionEnum.LEAD_CONVERTIDO,
    );
  } catch (error) {
    console.error('No se pudo enviar push de lead convertido:', error);
  }

  return convertido;
};

export const perderLeadService = async (leadId: string, reqUser?: any) => {
  if (reqUser?.rol !== 'admin' && reqUser?.rol !== 'vendedor') throw new ApiError('No autorizado', 403);
  const lead = await getLeadByIdService(leadId);
  if (lead.estado === EstadoLeadEnum.PERDIDO) throw new ApiError('Lead ya marcado como perdido', 400);
  if (lead.estado === EstadoLeadEnum.CONVERTIDO) throw new ApiError('No se puede marcar como perdido un lead convertido', 400);
  if (reqUser?.rol === 'vendedor' && lead.vendedor_asignado_id !== reqUser.vendedor_db_id) {
    throw new ApiError('No es tu lead', 403);
  }
  const perdido = await marcarLeadPerdido(leadId);

  // Web Push — evento `lead_perdido`: se notifica a los admins.
  try {
    const nombre = lead.datos_contacto?.nombre || 'el cliente';
    await enviarPushAAdmins(
      {
        titulo: '🚫 Lead perdido',
        cuerpo: `${nombre} fue marcado como lead perdido.`,
        url: '#/leads',
      },
      EventoNotificacionEnum.LEAD_PERDIDO,
    );
  } catch (error) {
    console.error('No se pudo enviar push de lead perdido:', error);
  }

  return perdido;
};

export const getHistorialReasignacionesService = async (leadId: string) => {
  const lead = await getLeadById(leadId);
  if (!lead) throw new ApiError('Lead no encontrado', 404);
  return lead.reasignaciones || [];
};

// SLA Monitor - para job cron
export const procesarSLAVencidos = async (horasSLA = 12) => {
  const leadsVencidos = await getLeadsSLAVencido(horasSLA);
  const resultados = [];

  for (const lead of leadsVencidos) {
    try {
      const vendedoresZona = await getVendedoresDeZona(lead.zona_id!);
      const vendedoresDisponibles = vendedoresZona.filter((v) => v.id !== lead.vendedor_asignado_id);

      if (vendedoresDisponibles.length > 0) {
        // Reasignar al vendedor con menor carga
        let mejorVendedor: Vendedor | null = null;
        let menorCarga = Infinity;
        const leadRepo = (await import('../config/dataBaseConfig')).AppDataSource.getRepository('leads');

        for (const v of vendedoresDisponibles) {
          const carga = await leadRepo.count({
            where: { vendedor_asignado_id: v.id, estado: In(['asignado', 'contactado', 'reasignado'] as EstadoLeadEnum[]) },
          });
          if (carga < menorCarga) {
            menorCarga = carga;
            mejorVendedor = v;
          }
        }

        if (mejorVendedor) {
          await reasignarLead(lead.id, mejorVendedor.id, 'sla_vencido');
          resultados.push({ leadId: lead.id, accion: 'reasignado', nuevoVendedorId: mejorVendedor.id });

          // Web Push — evento `lead_reasignado` por SLA: se avisa al nuevo vendedor.
          try {
            const nombre = lead.datos_contacto?.nombre || 'el cliente';
            await enviarPushAUsuario(
              mejorVendedor.id,
              {
                titulo: '⏰ SLA vencido · Lead reasignado a ti',
                cuerpo: `${nombre} venció el SLA de 12h y fue reasignado a ti. Dispones de 12 horas para atenderlo.`,
                url: '#/chat',
              },
              EventoNotificacionEnum.LEAD_REASIGNADO,
            );
          } catch (err) {
            console.error('No se pudo enviar push de reasignación por SLA:', err);
          }

          continue;
        }
      }

      // Sin vendedores disponibles en la zona -> notificar (fase 2: email Resend)
      resultados.push({ leadId: lead.id, accion: 'sin_vendedor_zona', notificacion: 'pendiente' });

      // Web Push — evento `sla_vencido_sin_vendedor`: se avisa a los admins.
      try {
        const nombre = lead.datos_contacto?.nombre || 'el cliente';
        await enviarPushAAdmins(
          {
            titulo: '⚠️ SLA vencido sin vendedor',
            cuerpo: `${nombre} venció el SLA de 12h y no hay vendedores disponibles en su zona para reasignarlo.`,
            url: '#/leads',
          },
          EventoNotificacionEnum.SLA_VENCIDO_SIN_VENDEDOR,
        );
      } catch (err) {
        console.error('No se pudo enviar push de SLA vencido sin vendedor:', err);
      }
    } catch (err) {
      resultados.push({ leadId: lead.id, accion: 'error', error: err instanceof Error ? err.message : String(err) });
    }
  }

  return resultados;
};