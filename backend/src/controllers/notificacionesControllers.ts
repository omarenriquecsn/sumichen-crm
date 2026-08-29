import { Request, Response } from 'express';
import {
  crearNotificacion,
  eliminarNotificacionService,
  marcarNotificacionComoLeidaService,
  marcarTodasComoLeidasService,
  obtenerNotificaciones,
} from '../services/notificacionesService';

// notificaciones.controller.ts
export const obtenerNotificacionesController = async (req: Request, res: Response) => {
  const usuarioId = req.params.id;
  const notificaciones = await obtenerNotificaciones(usuarioId);
  res.json(notificaciones);
};

export const crearNotificacionController = async (req: Request, res: Response) => {
  const usuarioId = req.body.vendedor_id;
  await crearNotificacion(req.body)(usuarioId, req.body.descripcion, req.body.tipo);
  res.status(201).send();
};

export const marcarNotificacionComoLeidaController = async (
  req: Request,
  res: Response,
) => {
  await marcarNotificacionComoLeidaService(req.params.id);
  res.status(204).send();
};

export const marcarTodasComoLeidasController = async (
  req: Request,
  res: Response,
) => {
  await marcarTodasComoLeidasService(req.params.id);
  res.status(204).send();
};

export const eliminarNotificacion = async (req: Request, res: Response) => {
  await eliminarNotificacionService(req.params.id);
  res.status(204).send();
};
