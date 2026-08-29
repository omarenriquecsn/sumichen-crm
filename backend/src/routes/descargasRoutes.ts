import { Router } from 'express';

import { asyncHandler } from '../middlewares/asyncHandler';
import verificarToken from '../middlewares/jwtHandler';
import { getDescargasActividades, getDescargasClientes, getDescargasMetas, getDescargasPedidos, getDescargasReuniones, getDescargasZonas, getDescargasLeads, getDescargasChats } from '../controllers/descargasControllers';

const router: Router = Router();

router.get('/descargas/pedidos', verificarToken, asyncHandler(getDescargasPedidos));
router.get('/descargas/clientes', verificarToken, asyncHandler(getDescargasClientes));
router.get('/descargas/reuniones', verificarToken, asyncHandler(getDescargasReuniones));
router.get('/descargas/actividades', verificarToken, asyncHandler(getDescargasActividades));
router.get('/descargas/metas', verificarToken, asyncHandler(getDescargasMetas));
router.get('/descargas/zonas', verificarToken, asyncHandler(getDescargasZonas));
router.get('/descargas/leads', verificarToken, asyncHandler(getDescargasLeads));
router.get('/descargas/chats', verificarToken, asyncHandler(getDescargasChats));

export default router;
