import { Request, Response } from 'express';
import {
  getCampanasService,
  createCampanaService,
  updateCampanaService,
  deleteCampanaService,
} from '../services/campanasServices';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../middlewares/asyncHandler';

const esAdmin = (req: Request) => {
  if (req.user?.rol !== 'admin') throw new ApiError('Solo administradores', 403);
};

export const getCampanas = asyncHandler(async (_req: Request, res: Response) => {
  const campanas = await getCampanasService();
  res.json(campanas);
});

export const createCampana = asyncHandler(async (req: Request, res: Response) => {
  esAdmin(req);
  const campana = await createCampanaService(req.body);
  res.status(201).json(campana);
});

export const updateCampana = asyncHandler(async (req: Request, res: Response) => {
  esAdmin(req);
  const { id } = req.params;
  const campana = await updateCampanaService(id, req.body);
  res.json(campana);
});

export const deleteCampana = asyncHandler(async (req: Request, res: Response) => {
  esAdmin(req);
  const { id } = req.params;
  await deleteCampanaService(id);
  res.status(204).send();
});
