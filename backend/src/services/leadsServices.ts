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

  return await reasignarLead(leadId, nuevoVendedorId, motivo);
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
  return await convertirLeadACliente(leadId, { ...datos, vendedor_id: vendedorId });
};

export const perderLeadService = async (leadId: string, reqUser?: any) => {
  if (reqUser?.rol !== 'admin' && reqUser?.rol !== 'vendedor') throw new ApiError('No autorizado', 403);
  const lead = await getLeadByIdService(leadId);
  if (lead.estado === EstadoLeadEnum.PERDIDO) throw new ApiError('Lead ya marcado como perdido', 400);
  if (lead.estado === EstadoLeadEnum.CONVERTIDO) throw new ApiError('No se puede marcar como perdido un lead convertido', 400);
  if (reqUser?.rol === 'vendedor' && lead.vendedor_asignado_id !== reqUser.vendedor_db_id) {
    throw new ApiError('No es tu lead', 403);
  }
  return await marcarLeadPerdido(leadId);
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
          continue;
        }
      }

      // Sin vendedores disponibles en la zona -> notificar (fase 2: email Resend)
      resultados.push({ leadId: lead.id, accion: 'sin_vendedor_zona', notificacion: 'pendiente' });
    } catch (err) {
      resultados.push({ leadId: lead.id, accion: 'error', error: err instanceof Error ? err.message : String(err) });
    }
  }

  return resultados;
};