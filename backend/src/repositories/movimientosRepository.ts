import { AppDataSource } from '../config/dataBaseConfig';
import { MovimientoInventario } from '../entities/MovimientoInventario';

const repo = () => AppDataSource.getRepository(MovimientoInventario);

export const createMovimiento = async (
  data: Partial<MovimientoInventario>,
) => {
  const nuevo = repo().create(data);
  return repo().save(nuevo);
};

export const getMovimientosPorPedido = async (pedidoId: string) =>
  repo().find({
    where: { pedido_id: pedidoId },
    order: { fecha_creacion: 'ASC' },
  });

export const getMovimientos = async (filtros?: {
  productoId?: string;
  tipo?: string;
}) => {
  const qb = repo().createQueryBuilder('m').orderBy('m.fecha_creacion', 'DESC');
  if (filtros?.productoId) {
    qb.andWhere('m.producto_id = :productoId', {
      productoId: filtros.productoId,
    });
  }
  if (filtros?.tipo) {
    qb.andWhere('m.tipo = :tipo', { tipo: filtros.tipo });
  }
  return qb.take(500).getMany();
};
