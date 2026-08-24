import { Router } from 'express';
import verificarToken from '../middlewares/jwtHandler';
import { asyncHandler } from '../middlewares/asyncHandler';
import {
  getLeads,
  getLeadById,
  createLeadWeb,
  createLeadInstagram,
  asignarLead,
  reasignarLead,
  convertirLead,
  perderLead,
  getHistorialReasignaciones,
  procesarSLA,
} from '../controllers/leadsControllers';
import { validarHMACMeta } from '../middlewares/validarHMACMeta';
import { limiterPublico, limiterWebhook } from '../middlewares/rateLimiter';

const router = Router();

// Endpoint público para formulario web (SIN JWT, con rate limit anti-spam)
router.post('/leads/web', limiterPublico, asyncHandler(createLeadWeb));

// Endpoint para webhook Instagram (valida HMAC, SIN JWT estándar)
router.post('/leads/instagram', limiterWebhook, validarHMACMeta, asyncHandler(createLeadInstagram));

// Rutas protegidas con JWT (acotado al prefijo /leads para no bloquear
// el endpoint público /leads/web ni otras rutas de la app)
router.use('/leads', verificarToken);

router.get('/leads', asyncHandler(getLeads));
router.get('/leads/:id', asyncHandler(getLeadById));
router.get('/leads/:id/historial-reasignaciones', asyncHandler(getHistorialReasignaciones));
router.put('/leads/:id/asignar', asyncHandler(asignarLead));
router.put('/leads/:id/reasignar', asyncHandler(reasignarLead));
router.put('/leads/:id/convertir', asyncHandler(convertirLead));
router.put('/leads/:id/perder', asyncHandler(perderLead));

// SLA manual (admin)
router.post('/leads/procesar-sla', asyncHandler(procesarSLA));

export default router;