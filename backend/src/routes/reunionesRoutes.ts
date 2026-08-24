import { Router, Request, Response } from 'express';
import {
  getReuniones,
  getReunionById,
  // getReunionesByVendedor,
  createReunion,
  updateReunion,
  deleteReunion,
} from '../controllers/reunionesControllers';
import { asyncHandler } from '../middlewares/asyncHandler';
import verificarToken from '../middlewares/jwtHandler';

const router: Router = Router();

router.get('/reuniones', verificarToken, asyncHandler(getReuniones));

router.get('/reuniones/:id', verificarToken, asyncHandler(getReunionById));

router.post('/reuniones', verificarToken, asyncHandler(createReunion));

router.put('/reuniones/:id', verificarToken, asyncHandler(updateReunion));

router.delete('/reuniones/:id', verificarToken, asyncHandler(deleteReunion));

export default router;
