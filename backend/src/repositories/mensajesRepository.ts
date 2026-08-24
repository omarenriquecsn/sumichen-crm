import { AppDataSource } from '../config/dataBaseConfig';
import { Mensaje } from '../entities/Mensaje';

export const getMensajes = async (conversacionId: string, page = 1, limit = 50) => {
  const repo = AppDataSource.getRepository(Mensaje);
  const qb = repo.createQueryBuilder('msg')
    .where('msg.conversacion_id = :conversacionId', { conversacionId })
    .orderBy('msg.fecha_creacion', 'ASC')
    .skip((page - 1) * limit)
    .take(limit);
  return await qb.getMany();
};

export const createMensaje = async (data: Partial<Mensaje>) => {
  const repo = AppDataSource.getRepository(Mensaje);
  const msg = repo.create(data);
  return await repo.save(msg);
};

export const getUltimosMensajes = async (conversacionId: string, limite = 10) => {
  const repo = AppDataSource.getRepository(Mensaje);
  return await repo.find({
    where: { conversacion_id: conversacionId },
    order: { fecha_creacion: 'DESC' },
    take: limite,
  });
};

/**
 * Evita duplicados: Meta puede re-entregar el mismo webhook. Cada mensaje de
 * WhatsApp trae un `id` (wamid) que guardamos en metadata.wamid; si ya existe
 * se ignora.
 */
export const mensajeExistePorWamid = async (wamid: string) => {
  const repo = AppDataSource.getRepository(Mensaje);
  const msg = await repo
    .createQueryBuilder('msg')
    .where(`msg.metadata->>'wamid' = :wamid`, { wamid })
    .getOne();
  return !!msg;
};