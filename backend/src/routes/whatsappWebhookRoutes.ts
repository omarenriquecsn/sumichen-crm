import { Router } from 'express';
import { verificarWebhook, recibirWebhook } from '../controllers/whatsappWebhookControllers';
import { validarHMACMeta } from '../middlewares/validarHMACMeta';
import { limiterWebhook } from '../middlewares/rateLimiter';

const router = Router();

// Verificación de suscripción (Meta hace GET para confirmar el webhook)
router.get('/webhook/whatsapp', verificarWebhook);

// Mensajes entrantes (Meta hace POST con firma X-Hub-Signature-256)
router.post('/webhook/whatsapp', limiterWebhook, validarHMACMeta, recibirWebhook);

export default router;
