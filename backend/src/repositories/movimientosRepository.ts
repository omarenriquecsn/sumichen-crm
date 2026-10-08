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

export const getMovimientos = async (
  filtros?: {
    productoId?: string;
    almacen?: string;
    tipo?: string;
    desde?: string;
    hasta?: string;
  },
  sinLimite = false,
) => {
  const qb = repo()
    .createQueryBuilder('m')
    .leftJoinAndSelect('m.lote', 'lote')
    .leftJoinAndSelect('m.producto', 'producto')
    .leftJoinAndSelect('m.pedido', 'pedido')
    .leftJoinAndSelect('pedido.cliente', 'cliente')
    .orderBy('m.fecha_creacion', 'DESC');

  if (filtros?.productoId) {
    qb.andWhere('m.producto_id = :productoId', {
      productoId: filtros.productoId,
    });
  }
  if (filtros?.almacen) {
    qb.andWhere('m.almacen = :almacen', { almacen: filtros.almacen });
  }
  if (filtros?.tipo) {
    qb.andWhere('m.tipo = :tipo', { tipo: filtros.tipo });
  }
  if (filtros?.desde) {
    qb.andWhere('m.fecha_creacion >= :desde', { desde: filtros.desde });
  }
  if (filtros?.hasta) {
    qb.andWhere('m.fecha_creacion <= :hasta', { hasta: filtros.hasta });
  }
  if (!sinLimite) qb.take(1000);
  return qb.getMany();
};
