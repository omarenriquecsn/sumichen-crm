import { Router } from 'express';
import {
  obtenerUrlAutorizacion,
  callbackGoogle,
  estadoGoogle,
  desconectarGoogle,
} from '../controllers/googleAuthControllers';
import { asyncHandler } from '../middlewares/asyncHandler';
import verificarToken from '../middlewares/jwtHandler';

const router: Router = Router();

// Devuelve la URL de consentimiento de Google (requiere sesión activa).
router.get('/auth/google/url', verificarToken, asyncHandler(obtenerUrlAutorizacion));

// Callback PÚBLICO: Google redirige aquí sin el JWT del CRM. La identidad del
// vendedor viaja en el `state` firmado.
router.get('/auth/google/callback', asyncHandler(callbackGoogle));

// Estado de la conexión Gmail del usuario autenticado.
router.get('/auth/google/status', verificarToken, asyncHandler(estadoGoogle));

// Desconecta la cuenta de Gmail del usuario autenticado.
router.delete('/auth/google', verificarToken, asyncHandler(desconectarGoogle));

export default router;
