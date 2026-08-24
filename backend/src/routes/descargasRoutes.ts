import { Router } from 'express';

import { asyncHandler } from '../middlewares/asyncHandler';
import verificarToken from '../middlewares/jwtHandler';
import { getDescargasActividades, getDescargasClientes, getDescargasMetas, getDescargasPedidos, getDescargasReuniones } from '../controllers/descargasControllers';

const router: Router = Router();

router.get('/descargas/pedidos', verificarToken, asyncHandler(getDescargasPedidos));
router.get('/descargas/clientes', verificarToken, asyncHandler(getDescargasClientes));
router.get('/descargas/reuniones', verificarToken, asyncHandler(getDescargasReuniones));
router.get('/descargas/actividades', verificarToken, asyncHandler(getDescargasActividades));
router.get('/descargas/metas', verificarToken, asyncHandler(getDescargasMetas));

export default router;
