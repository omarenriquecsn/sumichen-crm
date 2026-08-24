import { Router } from 'express';
import verificarToken from '../middlewares/jwtHandler';
import { asyncHandler } from '../middlewares/asyncHandler';
import {
  getConversaciones,
  getConversacionById,
  getConversacionByLead,
  abrirConversacion,
  enviarMensaje,
  getMensajes,
  recibirMensajeExterno,
  cerrarConversacion,
} from '../controllers/conversacionesControllers';
import { validarHMACMeta } from '../middlewares/validarHMACMeta';
import { limiterWebhook } from '../middlewares/rateLimiter';

const router = Router();

// Webhook WhatsApp/Instagram entrante (valida HMAC, SIN JWT estándar)
router.post('/conversaciones/webhook/:leadId', limiterWebhook, validarHMACMeta, asyncHandler(recibirMensajeExterno));

// Rutas protegidas con JWT (acotado al prefijo /conversaciones para no
// bloquear el webhook público /conversaciones/webhook/:leadId ni otras rutas)
router.use('/conversaciones', verificarToken);

router.get('/conversaciones', asyncHandler(getConversaciones));
router.get('/conversaciones/:id', asyncHandler(getConversacionById));
router.get('/conversaciones/lead/:leadId', asyncHandler(getConversacionByLead));
router.post('/conversaciones/lead/:leadId/abrir', asyncHandler(abrirConversacion));
router.post('/conversaciones/:id/mensajes', asyncHandler(enviarMensaje));
router.get('/conversaciones/:id/mensajes', asyncHandler(getMensajes));
router.delete('/conversaciones/:id', asyncHandler(cerrarConversacion));

export default router;