import { Router, Request, Response } from 'express';
import {
  getProductos,
  getProductoById,
  createProducto,
  updateProducto,
  subirInventario,
  subirListaPrecios,
} from '../controllers/productosControllers';
import { asyncHandler } from '../middlewares/asyncHandler';
import verificarToken from '../middlewares/jwtHandler';

const router: Router = Router();

// Todos los endpoints de productos requieren sesión autenticada (JWT de Supabase)
router.get('/productos', verificarToken, asyncHandler(getProductos));

router.get('/productos/:id', verificarToken, asyncHandler(getProductoById));

router.post('/productos', verificarToken, asyncHandler(createProducto));

router.post('/productos/excel', verificarToken, ...subirInventario);

router.post('/productos/lista-precios', verificarToken, ...subirListaPrecios);

router.put('/productos/:id', verificarToken, asyncHandler(updateProducto));

export default router;
