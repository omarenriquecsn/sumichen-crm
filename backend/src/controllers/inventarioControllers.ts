import { Request, Response } from 'express';
import {
  getLotesService,
  actualizarVencimientoLoteService,
  registrarAjusteService,
  getKardexService,
} from '../services/inventarioServices';
import { ApiError } from '../utils/ApiError';
import { AlmacenEnum } from '../enums/AlmacenEnum';
import { MotivoAjusteEnum } from '../enums/MotivoAjusteEnum';

/** Lista de lotes (con producto) para inventario/logística. */
export const getLotes = async (req: Request, res: Response) => {
  const { producto_id, almacen } = req.query;
  const lotes = await getLotesService({
    productoId: typeof producto_id === 'string' ? producto_id : undefined,
    almacen:
      typeof almacen === 'string' ? (almacen as AlmacenEnum) : undefined,
    soloConStock: req.query.con_stock === 'true',
  });
  res.json(lotes);
};

/** Edita la fecha de vencimiento de un lote (solo admin). */
export const actualizarVencimiento = async (req: Request, res: Response) => {
  if (req.user?.rol !== 'admin') {
    throw new ApiError('Solo administradores', 403);
  }
  const { id } = req.params;
  const raw = req.body?.fecha_vencimiento;
  const fecha =
    raw === null || raw === undefined || raw === '' ? null : String(raw);
  const lote = await actualizarVencimientoLoteService(id, fecha);
  res.json(lote);
};

/** Registra un ajuste manual de inventario (solo admin). */
export const registrarAjuste = async (req: Request, res: Response) => {
  if (req.user?.rol !== 'admin') {
    throw new ApiError('Solo administradores', 403);
  }
  const {
    producto_id,
    almacen,
    lote_id,
    direccion,
    cantidad,
    motivo_categoria,
    motivo,
  } = req.body || {};

  if (direccion !== 'entrada' && direccion !== 'salida') {
    throw new ApiError('La dirección debe ser entrada o salida', 400);
  }

  const movimiento = await registrarAjusteService(
    {
      producto_id,
      almacen: almacen as AlmacenEnum,
      lote_id,
      direccion,
      cantidad: Number(cantidad),
      motivo_categoria: motivo_categoria as MotivoAjusteEnum,
      motivo,
    },
    req.user?.vendedor_db_id,
  );
  res.status(201).json(movimiento);
};

/** Kardex de inventario (historial de movimientos). */
export const getKardex = async (req: Request, res: Response) => {
  const s = (v: unknown) => (typeof v === 'string' ? v : undefined);
  const movimientos = await getKardexService({
    productoId: s(req.query.producto_id),
    almacen: s(req.query.almacen),
    tipo: s(req.query.tipo),
    desde: s(req.query.desde),
    hasta: s(req.query.hasta),
  });
  res.json(movimientos);
};
