import { AppDataSource } from '../config/dataBaseConfig';
import { Pedido } from '../entities/Pedidos';

export const getPedidos = async () => {
  const PedidoRepository = AppDataSource.getRepository(Pedido);
  return await PedidoRepository.find({
    order: { fecha_creacion: 'DESC' },
  });
};

export const getPedidoById = async (id: string) => {
  const PedidoRepository = AppDataSource.getRepository(Pedido);
  return await PedidoRepository.find({
    where: { vendedor_id: id },
    relations: ['productos_pedido'],
    order: { fecha_creacion: 'DESC' },
  });
};

export const createPedido = async (PedidoData: Partial<Pedido>) => {
  const PedidoRepository = AppDataSource.getRepository(Pedido);
  const newPedido = PedidoRepository.create(PedidoData);
  return await PedidoRepository.save(newPedido);
};

export const updatePedido = async (id: string, PedidoData: Partial<Pedido>) => {
  const PedidoRepository = AppDataSource.getRepository(Pedido);
  await PedidoRepository.update(id, PedidoData);
  return await PedidoRepository.findOneBy({ id });
};

export const deletePedido = async (id: string) => {
  const PedidoRepository = AppDataSource.getRepository(Pedido);
  return await PedidoRepository.delete(id);
};
