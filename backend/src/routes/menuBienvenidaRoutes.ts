import { Router } from 'express';
import verificarToken from '../middlewares/jwtHandler';
import { asyncHandler } from '../middlewares/asyncHandler';
import { getMenuBienvenida, updateMenuBienvenida } from '../controllers/menuBienvenidaControllers';

const router = Router();

// Configuración del asistente de bienvenida (solo admin; GET accesible con JWT)
router.use('/menu-bienvenida', verificarToken);

router.get('/menu-bienvenida', asyncHandler(getMenuBienvenida));
router.put('/menu-bienvenida', asyncHandler(updateMenuBienvenida));

export default router;
