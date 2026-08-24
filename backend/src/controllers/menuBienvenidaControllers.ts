import { Request, Response } from 'express';
import { getMenuBienvenidaService, updateMenuBienvenidaService } from '../services/menuBienvenidaServices';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../middlewares/asyncHandler';

const esAdmin = (req: Request) => {
  if (req.user?.rol !== 'admin') throw new ApiError('Solo administradores', 403);
};

export const getMenuBienvenida = asyncHandler(async (req: Request, res: Response) => {
  const config = await getMenuBienvenidaService();
  res.json(config || {});
});

export const updateMenuBienvenida = asyncHandler(async (req: Request, res: Response) => {
  esAdmin(req);
  const config = await updateMenuBienvenidaService(req.body);
  res.json(config);
});
