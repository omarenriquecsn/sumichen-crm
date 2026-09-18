import { In } from 'typeorm';
import { AppDataSource } from '../config/dataBaseConfig';
import { PedidoEvidencia } from '../entities/PedidoEvidencia';

export const crearEvidencia = async (data: Partial<PedidoEvidencia>) => {
  const repo = AppDataSource.getRepository(PedidoEvidencia);
  const nueva = repo.create(data);
  return await repo.save(nueva);
};

export const listarEvidenciasPorPedido = async (pedidoId: string) => {
  const repo = AppDataSource.getRepository(PedidoEvidencia);
  return await repo.find({
    where: { pedido_id: pedidoId },
    order: { fecha_creacion: 'ASC' },
  });
};

export const buscarEvidenciaPorId = async (id: string) => {
  const repo = AppDataSource.getRepository(PedidoEvidencia);
  return await repo.findOneBy({ id });
};

export const eliminarEvidencia = async (id: string) => {
  const repo = AppDataSource.getRepository(PedidoEvidencia);
  return await repo.delete(id);
};

export const listarEvidenciasPorPedidos = async (pedidoIds: string[]) => {
  if (!pedidoIds.length) return [];
  const repo = AppDataSource.getRepository(PedidoEvidencia);
  return await repo.find({ where: { pedido_id: In(pedidoIds) } });
};
