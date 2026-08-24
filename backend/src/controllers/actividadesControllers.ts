import { Request, Response } from 'express';
import {
  getActividadesService,
  getActividadesByIdService,
  createActividadesService,
  updateActividadesService,
  deleteActividadesService,
} from '../services/actividadesServices';
import { ApiError } from '../utils/ApiError';

export const getActividades = async (req: Request, res: Response) => {
  const actividades = await getActividadesService();
  if (actividades.length === 0)
    throw new ApiError('No hay actividades para mostrar');

  res.json(actividades);
};

export const getActividadesById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { rol } = req.user;
  const actividad = await getActividadesByIdService(id, rol);

  if (!actividad) throw new ApiError('Actividad no encontrada', 404);

  res.json(actividad);
};

export const createActividades = async (req: Request, res: Response) => {
  const newActividad = await createActividadesService(req.body);

  if (!newActividad) throw new ApiError('No se ha creado la actividad', 400);

  res.json(newActividad);
};

export const updateActividades = async (req: Request, res: Response) => {
  const { id } = req.params;  
  const laActividad = await updateActividadesService(id, req.body);

  if (!laActividad) throw new ApiError('No se actualizo la activdad', 400);

  res.json(laActividad);
};

export const deleteActividades = async (req: Request, res: Response) => {
  const { id } = req.params;
  const actividadBorrada = await deleteActividadesService(id);

  if (!actividadBorrada)
    throw new ApiError('No se ha borrado la actividad', 400);
  res.status(204).send();
};
