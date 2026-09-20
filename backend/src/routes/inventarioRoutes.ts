import { Router } from 'express';
import {
  getLotes,
  actualizarVencimiento,
} from '../controllers/inventarioControllers';
import { asyncHandler } from '../middlewares/asyncHandler';
import verificarToken from '../middlewares/jwtHandler';

const router: Router = Router();

router.get('/inventario/lotes', verificarToken, asyncHandler(getLotes));

router.put(
  '/inventario/lotes/:id/vencimiento',
  verificarToken,
  asyncHandler(actualizarVencimiento),
);

export default router;
