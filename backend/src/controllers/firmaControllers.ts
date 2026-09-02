import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { ApiError } from '../utils/ApiError';
import { updateUsuario } from '../repositories/usuariosRepository';

export const MIME_POR_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

// Extensiones permitidas para la imagen/firma del vendedor.
const EXTENSIONES_PERMITIDAS = new Set(Object.keys(MIME_POR_EXT));
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });

/**
 * Carpeta donde se guardan las firmas/logo de los vendedores. Configurable con
 * `FIRMA_UPLOAD_PATH`; default: `backend/uploads/firmas`.
 */
export const getCarpetaFirmas = () =>
  process.env.FIRMA_UPLOAD_PATH || path.resolve(__dirname, '../../uploads/firmas');

/**
 * Sube (o sustituye) la imagen/firma del vendedor autenticado.
 *
 * La imagen es ÚNICA por vendedor: el archivo se guarda como
 * `{vendedor_db_id}.{ext}` (id de la tabla `vendedores`), de modo que al subir
 * una imagen nueva se reemplaza la anterior (se borran archivos previos con la
 * misma base de nombre y distinta extensión). Así se garantiza que al enviar un
 * correo se use SIEMPRE la imagen correcta del vendedor.
 */
export const subirFirma = [
  upload.single('file'),
  async (req: Request, res: Response) => {
    const vendedorDbId = req.user?.vendedor_db_id;
    if (!vendedorDbId) throw new ApiError('No autorizado', 401);
    if (!req.file) {
      throw new ApiError('No se ha subido ningún archivo', 400);
    }

    const nombreOriginal = req.file.originalname || 'firma.png';
    const ext = nombreOriginal.split('.').pop()?.toLowerCase() || '';
    if (!EXTENSIONES_PERMITIDAS.has(ext)) {
      throw new ApiError('Solo se admiten imágenes (JPG, PNG, WEBP, GIF)', 400);
    }

    const carpeta = getCarpetaFirmas();
    if (!fs.existsSync(carpeta)) {
      fs.mkdirSync(carpeta, { recursive: true });
    }

    // Sustituir la anterior: borra cualquier archivo previo de este vendedor
    // (misma base de nombre, distinta extensión posible).
    const previos = fs
      .readdirSync(carpeta)
      .filter((n) => n.startsWith(`${vendedorDbId}.`));
    for (const previo of previos) {
      try {
        fs.unlinkSync(path.join(carpeta, previo));
      } catch {
        // archivo previo no eliminable: se ignora
      }
    }

    const fileName = `${vendedorDbId}.${ext}`;
    const filePath = path.join(carpeta, fileName);
    fs.writeFileSync(filePath, req.file.buffer);

    const baseApiUrl = process.env.PUBLIC_API_URL || 'https://crmsumichen.com/api';
    const url = `${baseApiUrl}/firma/${encodeURIComponent(fileName)}`;

    // Guarda la URL en el perfil del vendedor (id de tabla vendedores).
    await updateUsuario(vendedorDbId, { firma_url: url });

    res.status(201).json({
      message: 'Imagen subida correctamente',
      nombre: fileName,
      url,
    });
  },
];

/**
 * Sirve la imagen de firma. Ruta pública (sin JWT) a propósito: la URL se
 * incrusta en el cuerpo del correo que se envía al cliente, y el destinatario
 * no tiene token de sesión. `path.basename` evita path traversal.
 */
export const getFirma = async (req: Request, res: Response) => {
  const fileName = path.basename(req.params.fileName || '');
  if (!fileName) throw new ApiError('Nombre de archivo inválido', 400);

  const filePath = path.join(getCarpetaFirmas(), fileName);
  if (!fs.existsSync(filePath)) {
    throw new ApiError('Archivo no encontrado', 404);
  }

  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const mime = MIME_POR_EXT[ext] || 'application/octet-stream';

  res.setHeader('Content-Type', mime);
  res.setHeader('Content-Disposition', 'inline');
  res.sendFile(filePath, (err) => {
    if (err && !res.headersSent) {
      res.status(404).json({ error: 'Archivo no encontrado' });
    }
  });
};

/**
 * Elimina la imagen/firma del vendedor autenticado y limpia `firma_url`.
 */
export const eliminarFirma = async (req: Request, res: Response) => {
  const vendedorDbId = req.user?.vendedor_db_id;
  if (!vendedorDbId) throw new ApiError('No autorizado', 401);

  const carpeta = getCarpetaFirmas();
  if (fs.existsSync(carpeta)) {
    const previos = fs
      .readdirSync(carpeta)
      .filter((n) => n.startsWith(`${vendedorDbId}.`));
    for (const previo of previos) {
      try {
        fs.unlinkSync(path.join(carpeta, previo));
      } catch {
        // archivo no eliminable: se ignora
      }
    }
  }

  await updateUsuario(vendedorDbId, { firma_url: null });
  res.json({ message: 'Imagen eliminada' });
};
