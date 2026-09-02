import { Router } from 'express';
import { enviarCorreo } from '../controllers/correosControllers';
import verificarToken from '../middlewares/jwtHandler';

const router: Router = Router();

// Enviar un correo al cliente vía Resend (JWT + multer para adjuntos).
router.post('/correos/enviar', verificarToken, enviarCorreo);

export default router;
