import { Request, Response } from 'express';
import {
  getLotesService,
  actualizarVencimientoLoteService,
} from '../services/inventarioServices';
import { ApiError } from '../utils/ApiError';
import { AlmacenEnum } from '../enums/AlmacenEnum';

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
