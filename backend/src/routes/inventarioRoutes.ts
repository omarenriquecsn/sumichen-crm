import { Router } from 'express';
import {
  getLotes,
  actualizarVencimiento,
  registrarAjuste,
  getKardex,
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

router.post('/inventario/ajustes', verificarToken, asyncHandler(registrarAjuste));

router.get('/inventario/kardex', verificarToken, asyncHandler(getKardex));

export default router;
