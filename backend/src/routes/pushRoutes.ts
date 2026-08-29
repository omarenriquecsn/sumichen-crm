import { Router } from 'express';
import verificarToken from '../middlewares/jwtHandler';
import { asyncHandler } from '../middlewares/asyncHandler';
import {
  guardarSuscripcionController,
  eliminarSuscripcionController,
  listarSuscripcionesController,
  enviarPruebaController,
} from '../controllers/pushControllers';

const router: Router = Router();

// Web Push (PWA): todas las rutas exigen JWT.
router.post('/push/suscripcion', verificarToken, asyncHandler(guardarSuscripcionController));
router.delete('/push/suscripcion', verificarToken, asyncHandler(eliminarSuscripcionController));
router.get('/push/suscripciones', verificarToken, asyncHandler(listarSuscripcionesController));
router.post('/push/test', verificarToken, asyncHandler(enviarPruebaController));

export default router;
