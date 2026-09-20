import { AppDataSource } from '../config/dataBaseConfig';
import { Lote } from '../entities/Lote';
import { AlmacenEnum } from '../enums/AlmacenEnum';

const repo = () => AppDataSource.getRepository(Lote);

export const getLote = async (
  productoId: string,
  almacen: AlmacenEnum,
  codigoLote: string,
) =>
  repo().findOneBy({
    producto_id: productoId,
    almacen,
    codigo_lote: codigoLote,
  });

export const createLote = async (data: Partial<Lote>) => {
  const nuevo = repo().create(data);
  return repo().save(nuevo);
};

/** Lotes con stock del producto/almacén ordenados FIFO (más viejo primero). */
export const getLotesFifo = async (
  productoId: string,
  almacen: AlmacenEnum,
) =>
  repo()
    .createQueryBuilder('l')
    .where('l.producto_id = :productoId', { productoId })
    .andWhere('l.almacen = :almacen', { almacen })
    .andWhere('l.cantidad_actual > 0')
    .orderBy('l.fecha_ingreso', 'ASC')
    .addOrderBy('l.fecha_creacion', 'ASC')
    .getMany();

export const getLoteById = async (id: string) => repo().findOneBy({ id });

export const updateCantidadActual = async (id: string, cantidad: number) =>
  repo().update(id, { cantidad_actual: cantidad });

/** Stock total (todas las bodegas) por producto: [{ producto_id, almacen, total }]. */
export const getStockAgrupado = async (): Promise<
  Array<{ producto_id: string; almacen: AlmacenEnum; total: string }>
> =>
  repo()
    .createQueryBuilder('l')
    .select('l.producto_id', 'producto_id')
    .addSelect('l.almacen', 'almacen')
    .addSelect('SUM(l.cantidad_actual)', 'total')
    .groupBy('l.producto_id')
    .addGroupBy('l.almacen')
    .getRawMany();

/** Suma de stock disponible de un producto (todos los almacenes). */
export const getStockTotalProducto = async (productoId: string) => {
  const row = await repo()
    .createQueryBuilder('l')
    .select('COALESCE(SUM(l.cantidad_actual), 0)', 'total')
    .where('l.producto_id = :productoId', { productoId })
    .getRawOne();
  return Number(row?.total ?? 0);
};
