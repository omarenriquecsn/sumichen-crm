import { Router, Request, Response } from 'express';
import {
  getPedidos,
  // getPedidoById,
  createPedido,
  updatePedido,
  deletePedido,
  getPedidosByVendedor,
  subirEvidencia,
} from '../controllers/pedidosControllers';
import { asyncHandler } from '../middlewares/asyncHandler';
import verificarToken from '../middlewares/jwtHandler';

const router: Router = Router();

router.get('/pedidos', verificarToken, asyncHandler(getPedidos));

router.get('/pedidos/:id', verificarToken, asyncHandler(getPedidosByVendedor));

router.post('/pedidos', verificarToken, asyncHandler(createPedido));

router.post('/pedidos/:id/evidencia', verificarToken, ...subirEvidencia);

router.put('/pedidos/:id', verificarToken, asyncHandler(updatePedido));

router.delete('/pedidos/:id', verificarToken, asyncHandler(deletePedido));

export default router;
