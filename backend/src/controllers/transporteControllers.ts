import { Request, Response } from 'express';
import {
  getTransporteService,
  saveTransporteService,
} from '../services/transporteServices';

export const getTransporte = async (req: Request, res: Response) => {
  const { pedidoId } = req.params;
  const transporte = await getTransporteService(pedidoId);
  res.json(transporte);
};

export const saveTransporte = async (req: Request, res: Response) => {
  const { pedidoId } = req.params;
  const transporte = await saveTransporteService(pedidoId, req.body, {
    id: req.user?.vendedor_db_id,
    rol: req.user?.rol,
  });
  res.json(transporte);
};
