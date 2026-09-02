import { Router } from 'express';
import {
  subirFirma,
  getFirma,
  eliminarFirma,
} from '../controllers/firmaControllers';
import { asyncHandler } from '../middlewares/asyncHandler';
import verificarToken from '../middlewares/jwtHandler';

const router: Router = Router();

// Subir / sustituir la imagen/firma del vendedor autenticado (JWT + multer).
router.post('/firma', verificarToken, subirFirma);

// Servir la imagen (PÚBLICA a propósito: la URL se usa en el pie del correo
// que se envía al cliente, que no tiene token de sesión).
router.get('/firma/:fileName', asyncHandler(getFirma));

// Eliminar la imagen/firma del vendedor autenticado.
router.delete('/firma', verificarToken, asyncHandler(eliminarFirma));

export default router;
