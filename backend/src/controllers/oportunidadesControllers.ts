import { Request, Response } from 'express';
import {
  getOportunidadesService,
  getOportunidadesByIdService,
  createOportunidadesService,
  updateOportunidadesService,
  deleteOportunidadesService,
} from '../services/oportunidadesServices';
import { ApiError } from '../utils/ApiError';

export const getOportunidades = async (req: Request, res: Response) => {
  const oportunidades = await getOportunidadesService();
  if (oportunidades.length === 0)
    throw new ApiError('No hay oportunidades registradas');
  res.json(oportunidades);
};

export const getOportunidadById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { rol } = req.user;
  const oportunidad = await getOportunidadesByIdService(id, rol);
  if (!oportunidad) throw new ApiError('Oportunidad no encontrada', 404);
  res.json(oportunidad);
};

export const createOportunidad = async (req: Request, res: Response) => {
  const nuevaOportunidad = await createOportunidadesService(req.body);
  if (!nuevaOportunidad)
    throw new ApiError('Error al crear la oportunidad', 400);
  res.status(201).json(nuevaOportunidad);
};

export const updateOportunidad = async (req: Request, res: Response) => {
  const { id } = req.params;
  const actualizada = await updateOportunidadesService(id, req.body);
  if (!actualizada)
    throw new ApiError('No se pudo actualizar la oportunidad', 400);
  res.json(actualizada);
};

export const deleteOportunidad = async (req: Request, res: Response) => {
  const { id } = req.params;
  const borrada = await deleteOportunidadesService(id);
  if (!borrada) throw new ApiError('No se pudo eliminar la oportunidad', 400);
  res.status(204).send();
};
