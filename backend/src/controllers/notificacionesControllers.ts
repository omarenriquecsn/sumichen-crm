import { Request, Response } from 'express';
import {
  crearNotificacion,
  eliminarNotificacionService,
  obtenerNotificaciones,
} from '../services/notificacionesService';
import { marcarNotificacionComoLeida } from '../repositories/notificacionesRepository';

// notificaciones.controller.ts
export const obtenerNotificacionesController = async (req: Request, res: Response) => {
  const usuarioId = req.params.id;
  console.log('usuarioId:', usuarioId);
  const notificaciones = await obtenerNotificaciones(usuarioId);
  res.json(notificaciones);
};

export const crearNotificacionController = async (req: Request, res: Response) => {
  const usuarioId = req.body.vendedor_id;
  console.log('usuarioId:', usuarioId);
  await crearNotificacion(req.body)(usuarioId, req.body.descripcion, req.body.tipo);
  res.status(201).send();
};

export const marcarNotificacionComoLeidaController = async (
  req: Request,
  res: Response,
) => {
  await marcarNotificacionComoLeida(req.params.id);
  res.status(204).send();
};

export const eliminarNotificacion = async (req: Request, res: Response) => {
  await eliminarNotificacionService(req.params.id);
  res.status(204).send();
};
