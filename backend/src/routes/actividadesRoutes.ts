import { Router, Request, Response } from 'express';
import {
  getActividades,
  getActividadesById,
  createActividades,
  updateActividades,
  deleteActividades,
} from '../controllers/actividadesControllers';
import { asyncHandler } from '../middlewares/asyncHandler';
import verificarToken from '../middlewares/jwtHandler';

const router: Router = Router();

router.get('/actividades',verificarToken, asyncHandler(getActividades));

router.get('/actividades/:id',verificarToken, asyncHandler(getActividadesById));

router.post('/actividades',verificarToken, asyncHandler(createActividades));

router.put('/actividades/:id',verificarToken, asyncHandler(updateActividades));

router.delete('/actividades/:id',verificarToken, asyncHandler(deleteActividades));

export default router;
