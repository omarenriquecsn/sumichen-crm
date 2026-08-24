import { Request, Response } from 'express';
import {
  getLeadsService,
  getLeadByIdService,
  createLeadWebService,
  asignarLeadService,
  reasignarLeadService,
  convertirLeadService,
  perderLeadService,
  getHistorialReasignacionesService,
  procesarSLAVencidos,
} from '../services/leadsServices';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../middlewares/asyncHandler';

export const getLeads = asyncHandler(async (req: Request, res: Response) => {
  const filtros = {
    vendedor_id: req.query.vendedor_id as string,
    zona_id: req.query.zona_id as string,
    estado: req.query.estado as string,
    origen: req.query.origen as string,
    desde: req.query.desde ? new Date(req.query.desde as string) : undefined,
    hasta: req.query.hasta
      ? parseHastaInclusive(req.query.hasta as string)
      : undefined,
    page: req.query.page ? parseInt(req.query.page as string) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
  };
  const resultado = await getLeadsService(filtros, req.user);
  res.json(resultado);
});

// Convierte un valor de fecha a Date. Si es solo fecha (YYYY-MM-DD), el
// `hasta` se interpreta como "todo ese día" (inclusive), porque
// `new Date('YYYY-MM-DD')` cae a medianoche UTC y excluiría los leads
// creados más tarde ese mismo día (off-by-one reportado en el dashboard).
const parseHastaInclusive = (valor: string): Date => {
  const d = new Date(valor);
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return d;
};

export const getLeadById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const lead = await getLeadByIdService(id, req.user);
  res.json(lead);
});

export const createLeadWeb = asyncHandler(async (req: Request, res: Response) => {
  // Endpoint público (sin JWT) para formulario web
  const lead = await createLeadWebService(req.body);
  res.status(201).json(lead);
});

export const createLeadInstagram = asyncHandler(async (req: Request, res: Response) => {
  // Endpoint para webhook Instagram (valida HMAC en middleware)
  const lead = await createLeadWebService({
    ...req.body,
    origen: 'instagram',
    tipo_web: null,
    canal_entrada: 'instagram_boton',
  });
  res.status(201).json(lead);
});

export const asignarLead = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { zona_id } = req.body;
  if (!zona_id) throw new ApiError('zona_id es obligatorio', 400);
  const lead = await asignarLeadService(id, zona_id, req.user);
  res.json(lead);
});

export const reasignarLead = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { vendedor_id, motivo } = req.body;
  if (!motivo) throw new ApiError('motivo es obligatorio', 400);
  const lead = await reasignarLeadService(id, vendedor_id || null, motivo, req.user);
  res.json(lead);
});

export const convertirLead = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const datos = req.body?.datos_cliente || req.body;
  const resultado = await convertirLeadService(id, req.user, datos);
  res.json(resultado);
});

export const perderLead = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const resultado = await perderLeadService(id, req.user);
  res.json(resultado);
});

export const getHistorialReasignaciones = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const historial = await getHistorialReasignacionesService(id);
  res.json(historial);
});

export const procesarSLA = asyncHandler(async (req: Request, res: Response) => {
  // Endpoint protegido para ejecutar manualmente el job SLA (admin)
  if (req.user?.rol !== 'admin') throw new ApiError('Solo administradores', 403);
  const horas = req.body.horas ?? 12;
  const resultado = await procesarSLAVencidos(horas);
  res.json({ procesados: resultado.length, detalles: resultado });
});