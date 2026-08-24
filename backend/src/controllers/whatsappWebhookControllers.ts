import { Request, Response } from 'express';
import { verificarWebhookWhatsApp, procesarWebhookWhatsApp } from '../services/whatsappWebhookServices';
import { asyncHandler } from '../middlewares/asyncHandler';

/**
 * GET /webhook/whatsapp — Verificación de suscripción de Meta.
 * Meta consulta con hub.mode, hub.verify_token y hub.challenge; si el token
 * coincide se responde con el challenge en texto plano (HTTP 200).
 */
export const verificarWebhook = asyncHandler(async (req: Request, res: Response) => {
  const challenge = verificarWebhookWhatsApp(req.query as Record<string, any>);
  res.type('text/plain').send(challenge);
});

/**
 * POST /webhook/whatsapp — Mensaje entrante desde WhatsApp (Meta Cloud API).
 * La firma HMAC la valida el middleware validarHMACMeta antes de llegar aquí.
 */
export const recibirWebhook = asyncHandler(async (req: Request, res: Response) => {
  const resultados = await procesarWebhookWhatsApp(req.body);
  // Meta espera 200 rápido; el procesamiento ya ocurrió de forma síncrona.
  res.status(200).json({ recibidos: resultados });
});
