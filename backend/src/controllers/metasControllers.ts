import { Request, Response } from 'express';
import {
  getMetasService,
  getMetasByIdService,
  createMetasService,
  updateMetasService,
  deleteMetasService,
} from '../services/metasServices';
import { ApiError } from '../utils/ApiError';

export const getMetas = async (req: Request, res: Response) => {
  if(req.user.rol !== 'admin') {
    throw new ApiError('No autorizado', 403);
  }
  const metas = await getMetasService();
  if (metas.length === 0) throw new ApiError('No hay metas para mostrar');
  res.json(metas);
};

export const getMetasById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { ano } = req.query;

  const { rol } = req.user;
  const meta = await getMetasByIdService(id, rol);

  if (!meta) throw new ApiError('Meta no encontrada', 404);

  res.json(meta);
};

export const createMetas = async (req: Request, res: Response) => {
  const nuevaMeta = await createMetasService(req.body);

  if (!nuevaMeta) throw new ApiError('No se ha creado la meta', 400);

  res.status(201).json(nuevaMeta);
};

export const updateMetas = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { rol } = req.user;
  const metaActualizada = await updateMetasService(id, req.body);

  if (!metaActualizada) throw new ApiError('No se actualizó la meta', 400);

  res.json(metaActualizada);
};

export const deleteMetas = async (req: Request, res: Response) => {
  const { id } = req.params;
  const metaBorrada = await deleteMetasService(id);

  if (!metaBorrada) throw new ApiError('No se ha borrado la meta', 400);

  res.status(204).send();
};
