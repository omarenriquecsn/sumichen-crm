import { Request, Response } from 'express';
import {
  getZonasService,
  getZonaByIdService,
  createZonaService,
  updateZonaService,
  deleteZonaService,
  asignarVendedorZonaService,
  desasignarVendedorZonaService,
  getVendedoresDeZonaService,
} from '../services/zonasServices';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../middlewares/asyncHandler';

export const getZonas = asyncHandler(async (req: Request, res: Response) => {
  const zonas = await getZonasService();
  res.json(zonas);
});

export const getZonaById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const zona = await getZonaByIdService(id);
  res.json(zona);
});

export const createZona = asyncHandler(async (req: Request, res: Response) => {
  const zona = await createZonaService(req.body);
  res.status(201).json(zona);
});

export const updateZona = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const zona = await updateZonaService(id, req.body);
  res.json(zona);
});

export const deleteZona = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  await deleteZonaService(id);
  res.status(204).send();
});

export const asignarVendedorZona = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { vendedor_id } = req.body;
  if (!vendedor_id) throw new ApiError('vendedor_id es obligatorio', 400);
  const vz = await asignarVendedorZonaService(id, vendedor_id);
  res.status(201).json(vz);
});

export const desasignarVendedorZona = asyncHandler(async (req: Request, res: Response) => {
  const { id, vendedorId } = req.params;
  await desasignarVendedorZonaService(id, vendedorId);
  res.status(204).send();
});

export const getVendedoresDeZona = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const vendedores = await getVendedoresDeZonaService(id);
  res.json(vendedores);
});