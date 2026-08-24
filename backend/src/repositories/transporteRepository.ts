import { AppDataSource } from '../config/dataBaseConfig';
import { Pedido } from '../entities/Pedidos';
import { Transporte } from '../entities/Transporte';

export const getTransporteByPedidoId = async (pedidoId: string) => {
  const PedidoRepository = AppDataSource.getRepository(Pedido);
  const pedido = await PedidoRepository.findOne({
    where: { id: pedidoId },
    relations: ['transporte_detalle'],
  });
  return pedido?.transporte_detalle ?? null;
};

export const createTransporte = async (data: Partial<Transporte>) => {
  const TransporteRepository = AppDataSource.getRepository(Transporte);
  const nuevo = TransporteRepository.create(data);
  return await TransporteRepository.save(nuevo);
};

export const updateTransporte = async (
  id: string,
  data: Partial<Transporte>,
) => {
  const TransporteRepository = AppDataSource.getRepository(Transporte);
  await TransporteRepository.update(id, data);
  return await TransporteRepository.findOneBy({ id });
};

export const setPedidoTransporte = async (
  pedidoId: string,
  transporteId: string,
) => {
  const PedidoRepository = AppDataSource.getRepository(Pedido);
  const pedido = await PedidoRepository.findOneBy({ id: pedidoId });
  if (!pedido) return null;
  pedido.transporte_detalle = { id: transporteId } as Transporte;
  return await PedidoRepository.save(pedido);
};
