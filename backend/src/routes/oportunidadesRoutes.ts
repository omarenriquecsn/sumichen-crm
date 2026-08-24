import { Router, Request, Response } from 'express';
import {
  getOportunidades,
  getOportunidadById,
  createOportunidad,
  updateOportunidad,
  deleteOportunidad,
} from '../controllers/oportunidadesControllers';
import { asyncHandler } from '../middlewares/asyncHandler';
import verificarToken from '../middlewares/jwtHandler';

const router: Router = Router();

router.get('/oportunidades', verificarToken, asyncHandler(getOportunidades));

router.get('/oportunidades/:id', verificarToken, asyncHandler(getOportunidadById));

router.post('/oportunidades', verificarToken, asyncHandler(createOportunidad));

router.put('/oportunidades/:id', verificarToken, asyncHandler(updateOportunidad));

router.delete('/oportunidades/:id', verificarToken, asyncHandler(deleteOportunidad));

export default router;
