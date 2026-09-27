import { Router } from 'express';
import verificarToken from '../middlewares/jwtHandler';
import { asyncHandler } from '../middlewares/asyncHandler';
import {
  getCampanas,
  createCampana,
  updateCampana,
  deleteCampana,
} from '../controllers/campanasControllers';

const router = Router();

// Todas las rutas requieren JWT. Acotado al prefijo /campanas para no afectar
// las rutas públicas (/health, /api-docs, webhooks).
router.use('/campanas', verificarToken);

router.get('/campanas', asyncHandler(getCampanas));
router.post('/campanas', asyncHandler(createCampana));
router.put('/campanas/:id', asyncHandler(updateCampana));
router.delete('/campanas/:id', asyncHandler(deleteCampana));

export default router;
