import { AppDataSource } from '../config/dataBaseConfig';
import { In } from 'typeorm';
import { Lead, EstadoLeadEnum } from '../entities/Lead';
import { Vendedor } from '../entities/Vendedores';
import { Zona } from '../entities/Zona';

export const getLeads = async (filtros: {
  vendedor_id?: string;
  zona_id?: string;
  estado?: string;
  origen?: string;
  desde?: Date;
  hasta?: Date;
  page?: number;
  limit?: number;
}) => {
  const repo = AppDataSource.getRepository(Lead);
  const qb = repo.createQueryBuilder('lead')
    .leftJoinAndSelect('lead.vendedor_asignado', 'vendedor')
    .leftJoinAndSelect('lead.zona', 'zona')
    .leftJoinAndSelect('lead.cliente', 'cliente')
    .orderBy('lead.fecha_creacion', 'DESC');

  if (filtros.vendedor_id) qb.andWhere('lead.vendedor_asignado_id = :vendedor_id', { vendedor_id: filtros.vendedor_id });
  if (filtros.zona_id) qb.andWhere('lead.zona_id = :zona_id', { zona_id: filtros.zona_id });
  if (filtros.estado) qb.andWhere('lead.estado = :estado', { estado: filtros.estado });
  if (filtros.origen) qb.andWhere('lead.origen = :origen', { origen: filtros.origen });
  if (filtros.desde) qb.andWhere('lead.fecha_creacion >= :desde', { desde: filtros.desde });
  if (filtros.hasta) qb.andWhere('lead.fecha_creacion <= :hasta', { hasta: filtros.hasta });

  const page = filtros.page ?? 1;
  const limit = filtros.limit ?? 20;
  qb.skip((page - 1) * limit).take(limit);

  const [data, total] = await qb.getManyAndCount();
  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const getLeadById = async (id: string) => {
  const repo = AppDataSource.getRepository(Lead);
  return await repo.findOne({
    where: { id },
    relations: ['vendedor_asignado', 'zona', 'cliente', 'reasignaciones', 'reasignaciones.vendedor_anterior', 'reasignaciones.vendedor_nuevo', 'conversaciones', 'conversaciones.mensajes'],
  });
};

/**
 * Busca un lead por número de teléfono (sin el "+", sin espacios, normalizado
 * a dígitos). Se compara contra datos_contacto->>'telefono' normalizado también
 * en SQL, de modo que un WhatsApp con 58412... encuentre un lead guardado como
 * "+58 412...".
 */
export const getLeadByTelefono = async (telefono: string) => {
  const repo = AppDataSource.getRepository(Lead);
  const normalizado = telefono.replace(/\D/g, '');
  if (!normalizado) return null;
  const sufijo = normalizado.slice(-10); // últimos 10 dígitos
  const lead = await repo
    .createQueryBuilder('lead')
    .where(`regexp_replace(COALESCE(lead.datos_contacto->>'telefono',''), '\D', '', 'g') LIKE :sufijo`, {
      sufijo: `%${sufijo}`,
    })
    .orderBy('lead.fecha_creacion', 'DESC')
    .getOne();
  return lead || null;
};

export const createLead = async (data: Partial<Lead>) => {
  const repo = AppDataSource.getRepository(Lead);
  const lead = repo.create(data);
  return await repo.save(lead);
};

export const updateLead = async (id: string, data: Partial<Lead>) => {
  const repo = AppDataSource.getRepository(Lead);
  await repo.update(id, data);
  return await repo.findOne({ where: { id } });
};

export const asignarLeadAutomatico = async (leadId: string, zonaId: string) => {
  const leadRepo = AppDataSource.getRepository(Lead);
  const lead = await leadRepo.findOne({ where: { id: leadId } });
  if (!lead || lead.estado !== EstadoLeadEnum.NUEVO) return null;

  const vendedores = await getVendedoresDeZona(zonaId);
  if (!vendedores.length) return null;

  // Buscar el vendedor con menos leads activos (asignado/contactado)
  let mejorVendedor: Vendedor | null = null;
  let menorCarga = Infinity;

  for (const v of vendedores) {
    const carga = await leadRepo.count({
      where: {
        vendedor_asignado_id: v.id,
        estado: In(['asignado', 'contactado', 'reasignado'] as EstadoLeadEnum[]),
      },
    });
    if (carga < menorCarga) {
      menorCarga = carga;
      mejorVendedor = v;
    }
  }

  if (!mejorVendedor) return null;

  lead.vendedor_asignado_id = mejorVendedor.id;
  lead.zona_id = zonaId;
  lead.estado = EstadoLeadEnum.ASIGNADO;
  lead.asignado_en = new Date();
  lead.ultima_actividad_en = new Date();

  return await leadRepo.save(lead);
};

export const reasignarLead = async (leadId: string, nuevoVendedorId: string | null, motivo: string, adminId?: string) => {
  const leadRepo = AppDataSource.getRepository(Lead);
  const reasigRepo = AppDataSource.getRepository('reasignaciones');
  const lead = await leadRepo.findOne({ where: { id: leadId } });
  if (!lead) throw new Error('Lead no encontrado');

  const anteriorId = lead.vendedor_asignado_id;
  lead.vendedor_asignado_id = nuevoVendedorId;
  lead.asignado_en = nuevoVendedorId ? new Date() : null;
  lead.ultima_actividad_en = new Date();
  lead.estado = nuevoVendedorId ? EstadoLeadEnum.REASIGNADO : EstadoLeadEnum.NUEVO;

  await leadRepo.save(lead);

  await reasigRepo.save({
    lead_id: leadId,
    vendedor_anterior_id: anteriorId,
    vendedor_nuevo_id: nuevoVendedorId,
    motivo: motivo as any,
  });

  return lead;
};

export const convertirLeadACliente = async (leadId: string, datos?: any) => {
  const leadRepo = AppDataSource.getRepository(Lead);
  const clienteRepo = AppDataSource.getRepository('clientes');
  const lead = await leadRepo.findOne({ where: { id: leadId } });
  if (!lead) throw new Error('Lead no encontrado');

  const cliente = clienteRepo.create({
    rif: datos?.rif || lead.metadata?.rif || `LEAD-${lead.id.slice(0, 8)}`,
    vendedor_id: datos?.vendedor_id || lead.vendedor_asignado_id,
    nombre: datos?.nombre || lead.datos_contacto.nombre,
    apellido: datos?.apellido || lead.datos_contacto.apellido || '',
    email: datos?.email || lead.datos_contacto.email || '',
    telefono: datos?.telefono || lead.datos_contacto.telefono,
    empresa: datos?.empresa || lead.datos_contacto.nombre,
    estado: datos?.estado || 'activo',
    etapa_venta: datos?.etapa_venta || 'inicial',
    direccion: datos?.direccion || lead.metadata?.direccion || '',
    ciudad: datos?.ciudad || lead.metadata?.ciudad || '',
    direccion_entrega: datos?.direccion_entrega || undefined,
    google_maps: datos?.google_maps || undefined,
    sector: datos?.sector ?? lead.metadata?.sector ?? null,
    notas: datos?.notas || undefined,
  });

  const clienteGuardado = await clienteRepo.save(cliente);

  lead.cliente_id = clienteGuardado.id;
  lead.estado = EstadoLeadEnum.CONVERTIDO;
  lead.ultima_actividad_en = new Date();
  await leadRepo.save(lead);

  return { lead, cliente: clienteGuardado };
};

export const marcarLeadPerdido = async (leadId: string) => {
  const leadRepo = AppDataSource.getRepository(Lead);
  const lead = await leadRepo.findOne({ where: { id: leadId } });
  if (!lead) throw new Error('Lead no encontrado');
  lead.estado = EstadoLeadEnum.PERDIDO;
  lead.ultima_actividad_en = new Date();
  return await leadRepo.save(lead);
};

export const getVendedoresDeZona = async (zonaId: string): Promise<Vendedor[]> => {
  const vzRepo = AppDataSource.getRepository('vendedor_zona');
  const vz = await vzRepo.find({ where: { zona_id: zonaId }, relations: ['vendedor'] });
  return vz.map((v) => v.vendedor).filter((v) => v && v.activo);
};

export const getLeadsPorVencerSLA = async (horas: number) => {
  const repo = AppDataSource.getRepository(Lead);
  const limite = new Date(Date.now() - horas * 60 * 60 * 1000);
  return await repo.find({
    where: {
      estado: In(['asignado', 'contactado'] as EstadoLeadEnum[]),
      asignado_en: new Date(limite.getTime()) as any, // TypeORM no soporta < directamente en find, usar QB
    },
  });
};

export const getLeadsSLAVencido = async (horas: number) => {
  const repo = AppDataSource.getRepository(Lead);
  const limite = new Date(Date.now() - horas * 60 * 60 * 1000);
  // ⚠ Incluir 'reasignado': tras una reasignación el lead queda en ese estado
  // (con asignado_en reiniciado) y debe seguir monitoreándose para el nuevo vendedor.
  return await repo
    .createQueryBuilder('lead')
    .where('lead.estado IN (:...estados)', { estados: ['asignado', 'contactado', 'reasignado'] })
    .andWhere('lead.asignado_en < :limite', { limite })
    .andWhere('lead.ultima_actividad_en < :limite', { limite })
    .leftJoinAndSelect('lead.vendedor_asignado', 'vendedor')
    .leftJoinAndSelect('lead.zona', 'zona')
    .getMany();
};