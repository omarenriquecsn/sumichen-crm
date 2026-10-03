import { AppDataSource } from '../config/dataBaseConfig';
import { Pedido } from '../entities/Pedidos';

/**
 * Devuelve el conjunto de `cliente_id` que tienen al menos un pedido en estado
 * de venta (`procesado` o `devuelto_parcial`). Se usa para saber si un lead
 * convertido en cliente efectivamente compró.
 */
export const getClientesConCompra = async (
  clienteIds: string[],
): Promise<Set<string>> => {
  const ids = (clienteIds || []).filter((id) => !!id);
  if (!ids.length) return new Set();
  const PedidoRepository = AppDataSource.getRepository(Pedido);
  const rows = await PedidoRepository.createQueryBuilder('p')
    .select('DISTINCT p.cliente_id', 'cliente_id')
    .where('p.cliente_id IN (:...ids)', { ids })
    .andWhere('p.estado IN (:...estados)', {
      estados: ['procesado', 'devuelto_parcial'],
    })
    .getRawMany();
  return new Set(rows.map((r) => r.cliente_id as string));
};

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

/** Un pedido por su id (pk). */
export const getPedido = async (id: string) => {
  const PedidoRepository = AppDataSource.getRepository(Pedido);
  return await PedidoRepository.findOne({ where: { id } });
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
