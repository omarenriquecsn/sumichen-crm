import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  let status = err.status || 500;
  let message = err.message || 'Error interno del servidor';

  // Errores de subida de archivos (multer): responder 400 con mensaje claro.
  if (err instanceof multer.MulterError) {
    status = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'Uno de los archivos supera el tamaño máximo permitido (25 MB).';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      message = 'Se superó el número máximo de archivos permitidos (10).';
    } else {
      message = `Error al subir archivos: ${err.code}`;
    }
  }

  console.error(`[${req.method}] ${req.originalUrl} → ${status}: ${message}`);

  res.status(status).json({ success: false, message });
};
