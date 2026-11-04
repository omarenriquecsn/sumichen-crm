import { Request, Response } from 'express';
import {
  createDiaNoLaborableService,
  deleteDiaNoLaborableService,
  getDiasNoLaborablesService,
} from '../services/diasNoLaborablesServices';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../middlewares/asyncHandler';

const esAdmin = (req: Request) => {
  if (req.user?.rol !== 'admin') throw new ApiError('Solo administradores', 403);
};

export const getDiasNoLaborables = asyncHandler(
  async (_req: Request, res: Response) => {
    const dias = await getDiasNoLaborablesService();
    res.json(dias);
  },
);

export const createDiaNoLaborable = asyncHandler(
  async (req: Request, res: Response) => {
    esAdmin(req);
    const dia = await createDiaNoLaborableService(req.body);
    res.status(201).json(dia);
  },
);

export const deleteDiaNoLaborable = asyncHandler(
  async (req: Request, res: Response) => {
    esAdmin(req);
    const { id } = req.params;
    await deleteDiaNoLaborableService(id);
    res.status(204).send();
  },
);
