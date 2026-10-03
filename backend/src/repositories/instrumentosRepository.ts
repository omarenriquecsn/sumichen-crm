import { AppDataSource } from '../config/dataBaseConfig';
import { TipoInstrumento } from '../entities/TipoInstrumento';
import { InstrumentoStock } from '../entities/InstrumentoStock';
import { MovimientoInstrumento } from '../entities/MovimientoInstrumento';
import { PedidoInstrumento } from '../entities/PedidoInstrumento';

// ------------------------------- Tipos -------------------------------

export const getTiposInstrumento = async (soloActivos = false) =>
  AppDataSource.getRepository(TipoInstrumento).find({
    where: soloActivos ? { activo: true } : {},
    order: { nombre: 'ASC' },
  });

export const getTipoInstrumentoById = async (id: string) =>
  AppDataSource.getRepository(TipoInstrumento).findOneBy({ id });

export const getTipoInstrumentoByNombre = async (nombre: string) =>
  AppDataSource.getRepository(TipoInstrumento).findOneBy({ nombre });

export const createTipoInstrumento = async (data: Partial<TipoInstrumento>) => {
  const repo = AppDataSource.getRepository(TipoInstrumento);
  return repo.save(repo.create(data));
};

export const updateTipoInstrumento = async (
  id: string,
  data: Partial<TipoInstrumento>,
) => {
  await AppDataSource.getRepository(TipoInstrumento).update(id, data);
  return getTipoInstrumentoById(id);
};

// ------------------------------- Stock -------------------------------

export const getStockInstrumentos = async () =>
  AppDataSource.getRepository(InstrumentoStock).find({
    relations: ['tipo_instrumento'],
  });

export const getStockInstrumento = async (
  tipoInstrumentoId: string,
  almacen: string,
) =>
  AppDataSource.getRepository(InstrumentoStock).findOne({
    where: { tipo_instrumento_id: tipoInstrumentoId, almacen: almacen as any },
  });

// --------------------------- Movimientos -----------------------------

export const getMovimientosInstrumento = async (
  filtros?: {
    tipoInstrumentoId?: string;
    almacen?: string;
    desde?: string;
    hasta?: string;
  },
  sinLimite = false,
) => {
  const qb = AppDataSource.getRepository(MovimientoInstrumento)
    .createQueryBuilder('m')
    .leftJoinAndSelect('m.tipo_instrumento', 'tipo')
    .leftJoinAndSelect('m.cliente', 'cliente')
    .orderBy('m.fecha_creacion', 'DESC');

  if (filtros?.tipoInstrumentoId) {
    qb.andWhere('m.tipo_instrumento_id = :t', {
      t: filtros.tipoInstrumentoId,
    });
  }
  if (filtros?.almacen) {
    qb.andWhere('m.almacen = :almacen', { almacen: filtros.almacen });
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

// ----------------------- Líneas de pedido ----------------------------

export const getPedidoInstrumentos = async (pedidoId: string) =>
  AppDataSource.getRepository(PedidoInstrumento).find({
    where: { pedido_id: pedidoId },
    relations: ['tipo_instrumento'],
    order: { fecha_creacion: 'ASC' },
  });

export const getPedidoInstrumentoById = async (id: string) =>
  AppDataSource.getRepository(PedidoInstrumento).findOne({
    where: { id },
    relations: ['tipo_instrumento'],
  });

/** Todas las líneas de instrumentos (para la lista de clientes/inventario). */
export const getTodosPedidoInstrumentos = async () =>
  AppDataSource.getRepository(PedidoInstrumento).find({
    relations: ['tipo_instrumento', 'pedido', 'pedido.cliente'],
    order: { fecha_creacion: 'DESC' },
  });
