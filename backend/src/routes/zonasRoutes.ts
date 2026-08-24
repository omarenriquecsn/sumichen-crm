import { Router } from 'express';
import verificarToken from '../middlewares/jwtHandler';
import { asyncHandler } from '../middlewares/asyncHandler';
import {
  getZonas,
  getZonaById,
  createZona,
  updateZona,
  deleteZona,
  asignarVendedorZona,
  desasignarVendedorZona,
  getVendedoresDeZona,
} from '../controllers/zonasControllers';

const router = Router();

// Todas las rutas requieren JWT
// Acotado al prefijo /zonas: sin ruta quedaría global y bloquearía /health
router.use('/zonas', verificarToken);

// CRUD Zonas
router.get('/zonas', asyncHandler(getZonas));
router.get('/zonas/:id', asyncHandler(getZonaById));
router.post('/zonas', asyncHandler(createZona));
router.put('/zonas/:id', asyncHandler(updateZona));
router.delete('/zonas/:id', asyncHandler(deleteZona));

// Asignación vendedores a zona
router.post('/zonas/:id/vendedores', asyncHandler(asignarVendedorZona));
router.delete('/zonas/:id/vendedores/:vendedorId', asyncHandler(desasignarVendedorZona));
router.get('/zonas/:id/vendedores', asyncHandler(getVendedoresDeZona));

export default router;