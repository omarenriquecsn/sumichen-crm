import { Router } from 'express';
import verificarToken from '../middlewares/jwtHandler';
import { asyncHandler } from '../middlewares/asyncHandler';
import {
  obtenerPreferenciasController,
  guardarPreferenciasController,
} from '../controllers/preferenciasNotificacionControllers';

const router: Router = Router();

// Preferencias de notificación push por evento (PWA). Exigen JWT.
router.get('/preferencias-notificaciones', verificarToken, asyncHandler(obtenerPreferenciasController));
router.put('/preferencias-notificaciones', verificarToken, asyncHandler(guardarPreferenciasController));

export default router;
