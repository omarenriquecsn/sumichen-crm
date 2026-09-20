import { Router } from 'express';
import {
  getTipos,
  crearTipo,
  actualizarTipo,
  getStock,
  getClientes,
  registrarEntrada,
  registrarBaja,
  registrarAjuste,
  getKardex,
  getPedidoInstrumentos,
  entregarPedido,
  devolverLinea,
  donarLinea,
  danarLinea,
} from '../controllers/instrumentosControllers';
import { asyncHandler } from '../middlewares/asyncHandler';
import verificarToken from '../middlewares/jwtHandler';

const router: Router = Router();

// Catálogo y consultas
router.get('/instrumentos/tipos', verificarToken, asyncHandler(getTipos));
router.post('/instrumentos/tipos', verificarToken, asyncHandler(crearTipo));
router.put(
  '/instrumentos/tipos/:id',
  verificarToken,
  asyncHandler(actualizarTipo),
);
router.get('/instrumentos/stock', verificarToken, asyncHandler(getStock));
router.get('/instrumentos/clientes', verificarToken, asyncHandler(getClientes));

// Movimientos / reposición (admin)
router.post(
  '/instrumentos/entradas',
  verificarToken,
  asyncHandler(registrarEntrada),
);
router.post('/instrumentos/bajas', verificarToken, asyncHandler(registrarBaja));
router.post(
  '/instrumentos/ajustes',
  verificarToken,
  asyncHandler(registrarAjuste),
);
router.get('/instrumentos/kardex', verificarToken, asyncHandler(getKardex));

// Instrumentos de un pedido
router.get(
  '/pedidos/:id/instrumentos',
  verificarToken,
  asyncHandler(getPedidoInstrumentos),
);
router.post(
  '/pedidos/:id/instrumentos/entregar',
  verificarToken,
  asyncHandler(entregarPedido),
);
router.put(
  '/pedidos/instrumentos/:lineaId/devolver',
  verificarToken,
  asyncHandler(devolverLinea),
);
router.put(
  '/pedidos/instrumentos/:lineaId/donar',
  verificarToken,
  asyncHandler(donarLinea),
);
router.put(
  '/pedidos/instrumentos/:lineaId/danar',
  verificarToken,
  asyncHandler(danarLinea),
);

export default router;
