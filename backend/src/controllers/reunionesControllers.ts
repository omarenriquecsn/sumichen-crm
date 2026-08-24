import { Request, Response } from 'express';
import {
  getReunionesService,
  getReunionesByIdService,
  getReunionesByVendedorService,
  createReunionesService,
  updateReunionesService,
  deleteReunionesService,
} from '../services/reunionesServices';
import { ApiError } from '../utils/ApiError';

export const getReuniones = async (req: Request, res: Response) => {
  const reuniones = await getReunionesService();
  if (reuniones.length === 0)
    throw new ApiError('No hay reuniones registradas');
  res.json(reuniones);
};

export const getReunionById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { rol } = req.user;
  const reuniones = await getReunionesByIdService(id, rol);
  if (reuniones.length === 0)
    throw new ApiError('No hay reuniones disponibles', 404);
  res.json(reuniones);
};

export const getReunionesByVendedor = async (id: string) => {
  const reuniones = await getReunionesService();
  return reuniones.filter((reunion) => reunion.vendedor_id === id);
};

export const createReunion = async (req: Request, res: Response) => {
  const nuevaReunion = await createReunionesService(req.body);
  if (!nuevaReunion) throw new ApiError('Error al crear la reunión', 400);
  res.status(201).json(nuevaReunion);
};

export const updateReunion = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { rol } = req.user;
  const reunionActualizada = await updateReunionesService(id, req.body, rol);
  if (!reunionActualizada)
    throw new ApiError('No se pudo actualizar la reunión', 400);
  res.json(reunionActualizada);
};

export const deleteReunion = async (req: Request, res: Response) => {
  const { id } = req.params;
  const reunionBorrada = await deleteReunionesService(id);
  if (!reunionBorrada)
    throw new ApiError('No se pudo eliminar la reunión', 400);
  res.status(204).send();
};
