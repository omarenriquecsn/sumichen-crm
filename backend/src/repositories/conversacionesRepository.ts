import { AppDataSource } from '../config/dataBaseConfig';
import { Conversacion, EstadoConversacionEnum } from '../entities/Conversacion';

export const getConversaciones = async (filtros: {
  vendedor_id?: string;
  estado?: string;
  lead_id?: string;
}) => {
  const repo = AppDataSource.getRepository(Conversacion);
  const qb = repo.createQueryBuilder('conv')
    .leftJoinAndSelect('conv.lead', 'lead')
    .leftJoinAndSelect('conv.vendedor', 'vendedor')
    .orderBy('conv.ultimo_mensaje_en', 'DESC')
    .addOrderBy('conv.fecha_creacion', 'DESC');

  if (filtros.vendedor_id) qb.andWhere('conv.vendedor_id = :vendedor_id', { vendedor_id: filtros.vendedor_id });
  if (filtros.estado) qb.andWhere('conv.estado = :estado', { estado: filtros.estado });
  if (filtros.lead_id) qb.andWhere('conv.lead_id = :lead_id', { lead_id: filtros.lead_id });

  return await qb.getMany();
};

export const getConversacionesParaExport = async () => {
  const repo = AppDataSource.getRepository(Conversacion);
  return await repo.find({
    relations: ['lead', 'vendedor', 'mensajes'],
    order: { ultimo_mensaje_en: 'DESC' },
  });
};

export const getConversacionById = async (id: string) => {
  const repo = AppDataSource.getRepository(Conversacion);
  return await repo.findOne({
    where: { id },
    relations: ['lead', 'vendedor', 'mensajes'],
  });
};

export const getConversacionByLeadId = async (leadId: string) => {
  const repo = AppDataSource.getRepository(Conversacion);
  return await repo.findOne({
    where: { lead_id: leadId },
    relations: ['lead', 'vendedor', 'mensajes'],
  });
};

export const createConversacion = async (data: Partial<Conversacion>) => {
  const repo = AppDataSource.getRepository(Conversacion);
  const conv = repo.create(data);
  return await repo.save(conv);
};

export const updateConversacion = async (id: string, data: Partial<Conversacion>) => {
  const repo = AppDataSource.getRepository(Conversacion);
  await repo.update(id, data);
  return await repo.findOne({ where: { id } });
};

export const cerrarConversacion = async (id: string) => {
  const repo = AppDataSource.getRepository(Conversacion);
  return await repo.update(id, { estado: EstadoConversacionEnum.CERRADA });
};