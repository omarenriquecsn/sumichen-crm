import { Request, Response } from 'express';
import multer from 'multer';
import { enviarCorreoCliente } from '../services/correosServices';
import { ApiError } from '../utils/ApiError';

// Recibe hasta 10 adjuntos. Se guardan en memoria (buffer) y se pasan a Resend.
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
});

export interface ArchivoSubido extends Express.Multer.File {}

/**
 * POST /correos/enviar — envía un correo al cliente vía Resend con el cuerpo
 * HTML y adjuntos opcionales. El remitente se arma con el perfil del vendedor
 * autenticado (req.user.vendedor_db_id).
 */
export const enviarCorreo = [
  upload.array('adjuntos', 10),
  async (req: Request, res: Response) => {
    const vendedorDbId = req.user?.vendedor_db_id;
    if (!vendedorDbId) throw new ApiError('No autorizado', 401);

    const { to, asunto, cuerpo } = req.body as {
      to?: string;
      asunto?: string;
      cuerpo?: string;
    };
    const adjuntos = (req.files as ArchivoSubido[] | undefined)?.map((f) => ({
      filename: f.originalname,
      buffer: f.buffer,
      mimetype: f.mimetype,
    })) || [];

    if (!to) throw new ApiError('El destinatario (to) es obligatorio', 400);

    const resultado = await enviarCorreoCliente({
      vendedorDbId,
      to: to.trim(),
      asunto: (asunto || '').trim(),
      cuerpoHtml: cuerpo || '',
      adjuntos,
    });

    res.json(resultado);
  },
];
