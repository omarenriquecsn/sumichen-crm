import { Router, Request, Response, NextFunction } from 'express';
import {
  listarUtilidades,
  getUtilidad,
  subirUtilidad,
  eliminarUtilidad,
} from '../controllers/utilidadesControllers';
import { asyncHandler } from '../middlewares/asyncHandler';
import verificarToken from '../middlewares/jwtHandler';

const router: Router = Router();

// Exige JWT. Acepta el token en el header `Authorization: Bearer` (estándar)
// o en el query string `?access_token=` (fallback necesario para abrir los
// documentos con <a target="_blank">, donde el navegador NO envía headers).
const verificarTokenUtilidades = (
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

// Documentos de la carpeta uploads/utilidades (horario, condiciones de
// despacho): requieren sesión autenticada para evitar fuga de documentos.
router.get('/utilidades', verificarToken, asyncHandler(listarUtilidades));
router.get('/utilidades/:fileName', verificarTokenUtilidades, asyncHandler(getUtilidad));

// Subir / eliminar documentos (solo admins, validado en el controlador).
router.post('/utilidades', verificarToken, subirUtilidad);
router.delete('/utilidades/:fileName', verificarToken, asyncHandler(eliminarUtilidad));

export default router;
