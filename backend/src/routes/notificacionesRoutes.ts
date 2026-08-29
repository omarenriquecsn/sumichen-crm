import { Router } from "express";
import { crearNotificacionController, eliminarNotificacion, marcarNotificacionComoLeidaController, marcarTodasComoLeidasController, obtenerNotificacionesController } from "../controllers/notificacionesControllers";
import { asyncHandler } from "../middlewares/asyncHandler";
import verificarToken from "../middlewares/jwtHandler";

const router: Router = Router();

router.get('/notificaciones/:id', verificarToken, asyncHandler(obtenerNotificacionesController));

router.post('/notificaciones', verificarToken, asyncHandler(crearNotificacionController));

router.patch('/notificaciones/:id/leida', verificarToken, asyncHandler(marcarNotificacionComoLeidaController));

router.patch('/notificaciones/:id/leida-todas', verificarToken, asyncHandler(marcarTodasComoLeidasController));

router.delete('/notificaciones/:id', verificarToken, asyncHandler(eliminarNotificacion));

export default router;