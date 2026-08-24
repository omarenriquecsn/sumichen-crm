import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { ApiError } from '../utils/ApiError';

export const validarHMACMeta = (req: Request, res: Response, next: NextFunction) => {
  const signature = req.headers['x-hub-signature-256'] as string;
  const appSecret = process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET;

  if (!appSecret) {
    console.warn('[HMAC] META_APP_SECRET no configurado, omitiendo validación');
    return next();
  }

  if (!signature) {
    throw new ApiError('Firma HMAC requerida', 401);
  }

  // ⚠ Usar SIEMPRE el body crudo (req.rawBody): Meta firma los bytes exactos
  // del request. express.json() ya parseó req.body, y JSON.stringify(req.body)
  // NO coincide con el body crudo (orden de claves/espacios/escapado).
  // server.ts captura el rawBody vía express.json({ verify }).
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  if (!rawBody) {
    throw new ApiError('No se pudo capturar el body crudo para verificar firma', 500);
  }

  const expectedSignature = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    throw new ApiError('Firma HMAC inválida', 401);
  }

  next();
};