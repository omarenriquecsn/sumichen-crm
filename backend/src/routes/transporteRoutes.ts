import { Router } from 'express';
import {
  getTransporte,
  saveTransporte,
} from '../controllers/transporteControllers';
import { asyncHandler } from '../middlewares/asyncHandler';
import verificarToken from '../middlewares/jwtHandler';

const router: Router = Router();

router.get('/transporte/pedido/:pedidoId', verificarToken, asyncHandler(getTransporte));

router.put('/transporte/pedido/:pedidoId', verificarToken, asyncHandler(saveTransporte));

export default router;
