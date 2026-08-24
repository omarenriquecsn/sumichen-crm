import { Router, Request, Response, NextFunction } from 'express';
import { getArchivos } from '../controllers/archivosControllers';
import { asyncHandler } from '../middlewares/asyncHandler';
import verificarToken from '../middlewares/jwtHandler';

const router: Router = Router();

// Exige JWT. Acepta el token en el header `Authorization: Bearer` (estándar)
// o en el query string `?access_token=` (fallback necesario para abrir la
// evidencia con <a target="_blank">, donde el navegador NO envía headers
// personalizados y por tanto no puede mandar el token).
const verificarTokenEvidencia = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const queryToken = req.query.access_token as string | undefined;
  if (queryToken && !req.headers.authorization) {
    req.headers.authorization = `Bearer ${queryToken}`;
  }
  verificarToken(req, res, next);
};

// Evidencias de pedidos: requieren sesión autenticada para evitar fuga de documentos.
router.get('/uploads/:fileName', verificarTokenEvidencia, asyncHandler(getArchivos));

export default router;
