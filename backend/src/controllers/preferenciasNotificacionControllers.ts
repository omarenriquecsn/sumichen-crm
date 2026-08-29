import { Request, Response } from 'express';
import {
  obtenerPreferenciasService,
  guardarPreferenciasService,
} from '../services/preferenciasNotificacionServices';

const vendedorDbId = (req: Request): string | undefined =>
  (req as any).user?.vendedor_db_id;

export const obtenerPreferenciasController = async (req: Request, res: Response) => {
  const vendedorId = vendedorDbId(req);
  if (!vendedorId) return res.status(401).json({ error: 'No autorizado' });

  const preferencias = await obtenerPreferenciasService(vendedorId);
  res.json(preferencias);
};

export const guardarPreferenciasController = async (req: Request, res: Response) => {
  const vendedorId = vendedorDbId(req);
  if (!vendedorId) return res.status(401).json({ error: 'No autorizado' });

  const { preferencias } = req.body || {};
  if (!Array.isArray(preferencias)) {
    return res.status(400).json({ error: 'preferencias debe ser un array' });
  }

  const guardadas = await guardarPreferenciasService(vendedorId, preferencias);
  res.json({ success: true, preferencias: guardadas });
};
