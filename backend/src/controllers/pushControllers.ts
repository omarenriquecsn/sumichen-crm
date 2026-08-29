import { Request, Response } from 'express';
import {
  guardarSuscripcion,
  eliminarSuscripcion,
  obtenerSuscripciones,
  enviarPushDePrueba,
  enviarLlamadaAlMovil,
} from '../services/pushServices';

const vendedorDbId = (req: Request): string | undefined =>
  (req as any).user?.vendedor_db_id;

export const guardarSuscripcionController = async (req: Request, res: Response) => {
  const vendedorId = vendedorDbId(req);
  if (!vendedorId) return res.status(401).json({ error: 'No autorizado' });

  const { subscription, dispositivo } = req.body || {};
  const endpoint = subscription?.endpoint;
  const p256dh = subscription?.keys?.p256dh;
  const auth = subscription?.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    return res.status(400).json({ error: 'Suscripción push incompleta' });
  }

  const guardada = await guardarSuscripcion({
    vendedor_id: vendedorId,
    endpoint,
    p256dh,
    auth,
    dispositivo: dispositivo || req.headers['user-agent'] || 'Dispositivo',
  });

  res.json({ success: true, suscripcion: guardada });
};

export const eliminarSuscripcionController = async (req: Request, res: Response) => {
  const { endpoint } = req.body || {};
  if (!endpoint) return res.status(400).json({ error: 'endpoint requerido' });

  await eliminarSuscripcion(endpoint);
  res.json({ success: true });
};

export const listarSuscripcionesController = async (req: Request, res: Response) => {
  const vendedorId = vendedorDbId(req);
  if (!vendedorId) return res.status(401).json({ error: 'No autorizado' });

  const suscripciones = await obtenerSuscripciones(vendedorId);
  res.json(suscripciones);
};

export const enviarPruebaController = async (req: Request, res: Response) => {
  const vendedorId = vendedorDbId(req);
  if (!vendedorId) return res.status(401).json({ error: 'No autorizado' });

  const enviadas = await enviarPushDePrueba(vendedorId);
  if (enviadas === 0) {
    return res
      .status(400)
      .json({ error: 'No hay dispositivos suscritos para este usuario' });
  }
  res.json({ success: true, enviadas });
};

export const enviarLlamadaController = async (req: Request, res: Response) => {
  const vendedorId = vendedorDbId(req);
  if (!vendedorId) return res.status(401).json({ error: 'No autorizado' });

  const { telefono, nombre, clienteId, endpointOrigen } = req.body || {};
  if (!telefono || !clienteId) {
    return res
      .status(400)
      .json({ error: 'telefono y clienteId son requeridos' });
  }

  const { enviadas, total } = await enviarLlamadaAlMovil(vendedorId, {
    telefono,
    nombre,
    clienteId,
    endpointOrigen,
  });

  res.json({ success: true, enviadas, total });
};
