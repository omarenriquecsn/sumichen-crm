import { Router, Request, Response } from 'express';
import {
  getMetas,
  getMetasById,
  createMetas,
  updateMetas,
  deleteMetas,
} from '../controllers/metasControllers';
import { asyncHandler } from '../middlewares/asyncHandler';
import verificarToken from '../middlewares/jwtHandler';

const router: Router = Router();

router.get('/metas', verificarToken, asyncHandler(getMetas));

router.get('/metas/:id/', verificarToken, asyncHandler(getMetasById));

router.post('/metas', verificarToken, asyncHandler(createMetas));

router.put('/metas/:id', verificarToken, asyncHandler(updateMetas));

router.delete('/metas/:id', verificarToken, asyncHandler(deleteMetas));

export default router;
