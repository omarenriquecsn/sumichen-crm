import { Request, Response } from 'express';
import path from 'path';
import { lookup } from 'mime-types';
import { getEvidenciasDir } from '../utils/limpiezaArchivos';

export const getArchivos = async (req: Request, res: Response) => {
  // `path.basename` evita traversal (el param no debería traer "/", pero se protege igual).
  const fileName = path.basename(req.params.fileName);
  const filePath = path.join(getEvidenciasDir(), fileName);

  const mime = (lookup(fileName) as string) || 'application/octet-stream';
  // PDF/imágenes/texto se muestran inline; el resto (Excel, Word, zip...) se descarga.
  const inline =
    mime === 'application/pdf' ||
    mime.startsWith('image/') ||
    mime.startsWith('text/');

  res.setHeader('Content-Type', mime);
  res.setHeader(
    'Content-Disposition',
    `${inline ? 'inline' : 'attachment'}; filename="${encodeURIComponent(
      fileName,
    )}"`,
  );

  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).json({ error: 'Archivo no encontrado' });
    }
  });
};
