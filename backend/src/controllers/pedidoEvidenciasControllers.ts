import { Request, Response } from 'express';
import multer from 'multer';
import {
  guardarEvidenciasService,
  getEvidenciasService,
  eliminarEvidenciaService,
} from '../services/pedidoEvidenciasServices';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../middlewares/asyncHandler';

// Los archivos se reciben en memoria y se escriben a disco tal cual (sin convertir).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 10 },
});

/**
 * Sube una o varias evidencias (imagen, PDF, Excel, Word, etc.) a un pedido.
 * Cada archivo se guarda de forma independiente; los que fallen se reportan
 * en `fallidos` sin tumbar la subida de los demás.
 */
export const subirEvidencias = [
  upload.array('files', 10),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const files = (req.files as Express.Multer.File[]) || [];
    if (!files.length) throw new ApiError('No se envió ningún archivo', 400);

    const { evidencias, fallidos } = await guardarEvidenciasService(
      id,
      files,
      req.user?.vendedor_db_id,
    );

    res.status(201).json({ evidencias, fallidos });
  }),
];

export const getEvidencias = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const evidencias = await getEvidenciasService(id);
    res.json(evidencias);
  },
);

export const eliminarEvidencia = asyncHandler(
  async (req: Request, res: Response) => {
    const { id, evidenciaId } = req.params;
    const resultado = await eliminarEvidenciaService(
      id,
      evidenciaId,
      req.user,
    );
    res.json(resultado);
  },
);
