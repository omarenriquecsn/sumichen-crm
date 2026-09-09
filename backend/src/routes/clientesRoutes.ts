import { Router } from 'express';
import {
  getClientes,
  getClientesById,
  createClientes,
  updateClientes,
  deleteClientes,
  deleteClientesDefinitivamente,
  subirProyecciones,
} from '../controllers/clientesControllers';
import { asyncHandler } from '../middlewares/asyncHandler';
import verificarToken from '../middlewares/jwtHandler';

const router: Router = Router();

router.get('/clientes', verificarToken, asyncHandler(getClientes));

// Carga de proyecciones por Excel (JWT; cualquier rol autenticado). Se declara
// antes de las rutas con :id. Solo actualiza `clientes.proyeccion_venta`.
router.post('/clientes/proyecciones', verificarToken, ...subirProyecciones);

router.get('/clientes/:id', verificarToken, asyncHandler(getClientesById));

router.post('/clientes', verificarToken, asyncHandler(createClientes));

router.put('/clientes/:id', verificarToken, asyncHandler(updateClientes));

router.delete('/clientes/:id', verificarToken, asyncHandler(deleteClientes));

router.delete(
  '/clientes/:id/definitivo',
  verificarToken,
  asyncHandler(deleteClientesDefinitivamente),
);

export default router;
