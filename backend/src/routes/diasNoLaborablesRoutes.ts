import { Router } from 'express';
import verificarToken from '../middlewares/jwtHandler';
import { asyncHandler } from '../middlewares/asyncHandler';
import {
  getDiasNoLaborables,
  createDiaNoLaborable,
  deleteDiaNoLaborable,
} from '../controllers/diasNoLaborablesControllers';

const router = Router();

// Todas las rutas requieren JWT. Acotado al prefijo /dias-no-laborables para
// no afectar las rutas públicas (/health, /api-docs, webhooks).
router.use('/dias-no-laborables', verificarToken);

router.get('/dias-no-laborables', asyncHandler(getDiasNoLaborables));
router.post('/dias-no-laborables', asyncHandler(createDiaNoLaborable));
router.delete('/dias-no-laborables/:id', asyncHandler(deleteDiaNoLaborable));

export default router;
