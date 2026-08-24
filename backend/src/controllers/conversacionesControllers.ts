import { Request, Response } from 'express';
import {
  getConversacionesService,
  getConversacionByIdService,
  getConversacionByLeadIdService,
  abrirConversacionParaLead,
  enviarMensajeService,
  getMensajesService,
  recibirMensajeExternoService,
  cerrarConversacionService,
} from '../services/conversacionesServices';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../middlewares/asyncHandler';

export const getConversaciones = asyncHandler(async (req: Request, res: Response) => {
  const filtros = {
    vendedor_id: req.query.vendedor_id as string,
    estado: req.query.estado as string,
    lead_id: req.query.lead_id as string,
  };
  const conversaciones = await getConversacionesService(filtros, req.user);
  res.json(conversaciones);
});

export const getConversacionById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const conv = await getConversacionByIdService(id, req.user);
  res.json(conv);
});

export const getConversacionByLead = asyncHandler(async (req: Request, res: Response) => {
  const { leadId } = req.params;
  const conv = await getConversacionByLeadIdService(leadId, req.user);
  if (!conv) return res.status(404).json({ message: 'No hay conversación para este lead' });
  res.json(conv);
});

export const abrirConversacion = asyncHandler(async (req: Request, res: Response) => {
  const { leadId } = req.params;
  const { vendedor_id, canal } = req.body;
  const vendedorId = vendedor_id || req.user?.vendedor_db_id;
  if (!vendedorId) throw new ApiError('vendedor_id requerido', 400);
  const conv = await abrirConversacionParaLead(leadId, vendedorId, canal || 'whatsapp');
  res.status(201).json(conv);
});

export const enviarMensaje = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { contenido, tipo, metadata } = req.body;
  if (!contenido?.trim()) throw new ApiError('El contenido es obligatorio', 400);
  const mensaje = await enviarMensajeService(
    id,
    req.user?.vendedor_db_id,
    contenido,
    tipo || 'texto',
    metadata || {},
    'vendedor',
    req.user
  );
  res.status(201).json(mensaje);
});

export const getMensajes = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const page = req.query.page ? parseInt(req.query.page as string) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
  const mensajes = await getMensajesService(id, page, limit, req.user);
  res.json(mensajes);
});

export const recibirMensajeExterno = asyncHandler(async (req: Request, res: Response) => {
  // Endpoint para webhook WhatsApp/Instagram (valida HMAC en middleware)
  const { leadId } = req.params;
  const { contenido, tipo, metadata } = req.body;
  if (!contenido?.trim()) throw new ApiError('El contenido es obligatorio', 400);
  const resultado = await recibirMensajeExternoService(leadId, contenido, tipo || 'texto', metadata || {});
  res.status(201).json(resultado);
});

export const cerrarConversacion = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  await cerrarConversacionService(id, req.user);
  res.status(204).send();
});