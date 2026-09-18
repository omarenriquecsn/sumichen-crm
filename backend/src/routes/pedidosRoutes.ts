import { Router, Request, Response } from 'express';
import {
  getPedidos,
  // getPedidoById,
  createPedido,
  updatePedido,
  deletePedido,
  getPedidosByVendedor,
  subirEvidencia,
  parsearCotizacion,
} from '../controllers/pedidosControllers';
import {
  subirEvidencias,
  getEvidencias,
  eliminarEvidencia,
} from '../controllers/pedidoEvidenciasControllers';
import { asyncHandler } from '../middlewares/asyncHandler';
import verificarToken from '../middlewares/jwtHandler';

const router: Router = Router();

router.get('/pedidos', verificarToken, asyncHandler(getPedidos));

router.get('/pedidos/:id', verificarToken, asyncHandler(getPedidosByVendedor));

router.post('/pedidos/parsear-cotizacion', verificarToken, ...parsearCotizacion);

router.post('/pedidos', verificarToken, asyncHandler(createPedido));

router.post('/pedidos/:id/evidencia', verificarToken, ...subirEvidencia);

// Evidencias múltiples (archivos originales sin convertir)
router.post('/pedidos/:id/evidencias', verificarToken, ...subirEvidencias);
router.get('/pedidos/:id/evidencias', verificarToken, getEvidencias);
router.delete(
  '/pedidos/:id/evidencias/:evidenciaId',
  verificarToken,
  eliminarEvidencia,
);

router.put('/pedidos/:id', verificarToken, asyncHandler(updatePedido));

router.delete('/pedidos/:id', verificarToken, asyncHandler(deletePedido));

export default router;
