import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { getCarpetaUtilidades } from '../utils/utilidadesWhatsapp';
import { ApiError } from '../utils/ApiError';

const MIME_POR_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  pdf: 'application/pdf',
};

// Extensiones permitidas al subir documentos desde Configuración → Documentos.
const EXTENSIONES_PERMITIDAS = new Set(Object.keys(MIME_POR_EXT));
const upload = multer({ limits: { fileSize: 20 * 1024 * 1024 } });

/**
 * Lista los documentos de la carpeta `uploads/utilidades` (nombre, tamaño y URL
 * pública para abrirlos). Sin rol específico: lo usan admins y vendedores.
 */
export const listarUtilidades = async (_req: Request, res: Response) => {
  const carpeta = getCarpetaUtilidades();
  if (!fs.existsSync(carpeta)) {
    return res.json([]);
  }
  const baseApiUrl = process.env.PUBLIC_API_URL || 'https://crmsumichen.com/api';
  const archivos = fs
    .readdirSync(carpeta)
    .filter((nombre) => !nombre.startsWith('.'))
    .map((nombre) => {
      const ruta = path.join(carpeta, nombre);
      let tamano = 0;
      try {
        tamano = fs.statSync(ruta).size;
      } catch {
        // archivo no legible: se reporta tamaño 0
      }
      return {
        nombre,
        tamaño: tamano,
        url: `${baseApiUrl}/utilidades/${encodeURIComponent(nombre)}`,
      };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  res.json(archivos);
};

/**
 * Sirve un documento de `uploads/utilidades`. `path.basename` evita path
 * traversal. Por defecto se muestra inline (imagen en el navegador); con
 * `?download=1` fuerza la descarga (`Content-Disposition: attachment`).
 */
export const getUtilidad = async (req: Request, res: Response) => {
  const fileName = path.basename(req.params.fileName || '');
  if (!fileName) throw new ApiError('Nombre de archivo inválido', 400);

  const carpeta = getCarpetaUtilidades();
  const filePath = path.join(carpeta, fileName);
  if (!fs.existsSync(filePath)) {
    throw new ApiError('Archivo no encontrado', 404);
  }

  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const mime = MIME_POR_EXT[ext] || 'application/octet-stream';

  res.setHeader('Content-Type', mime);
  res.setHeader(
    'Content-Disposition',
    req.query.download === '1' ? `attachment; filename="${fileName}"` : 'inline'
  );
  res.sendFile(filePath, (err) => {
    if (err && !res.headersSent) {
      res.status(404).json({ error: 'Archivo no encontrado' });
    }
  });
};

/**
 * Sube un documento a la carpeta `uploads/utilidades`. Solo admins. Se admiten
 * únicamente imágenes (JPG/PNG/WEBP/GIF) y PDF; el nombre se sane con
 * `path.basename` (anti path traversal) y, si ya existe un archivo con el mismo
 * nombre, se sobrescribe (comportamiento upsert).
 */
export const subirUtilidad = [
  upload.single('file'),
  async (req: Request, res: Response) => {
    if (req.user?.rol !== 'admin') throw new ApiError('Solo administradores', 403);
    if (!req.file) {
      throw new ApiError('No se ha subido ningún archivo', 400);
    }

    const nombreOriginal = req.file.originalname || 'documento';
    const ext = nombreOriginal.split('.').pop()?.toLowerCase() || '';
    if (!EXTENSIONES_PERMITIDAS.has(ext)) {
      throw new ApiError(
        'Solo se admiten imágenes (JPG, PNG, WEBP, GIF) y PDF',
        400,
      );
    }

    const fileName = path.basename(nombreOriginal).replace(/[\x00-\x1f]/g, '');
    const carpeta = getCarpetaUtilidades();
    if (!fs.existsSync(carpeta)) {
      fs.mkdirSync(carpeta, { recursive: true });
    }

    const filePath = path.join(carpeta, fileName);
    fs.writeFileSync(filePath, req.file.buffer);

    const baseApiUrl = process.env.PUBLIC_API_URL || 'https://crmsumichen.com/api';
    res.status(201).json({
      message: 'Documento subido exitosamente',
      nombre: fileName,
      url: `${baseApiUrl}/utilidades/${encodeURIComponent(fileName)}`,
    });
  },
];

/**
 * Elimina un documento de `uploads/utilidades`. Solo admins. `path.basename`
 * evita path traversal.
 */
export const eliminarUtilidad = async (req: Request, res: Response) => {
  if (req.user?.rol !== 'admin') throw new ApiError('Solo administradores', 403);

  const fileName = path.basename(req.params.fileName || '');
  if (!fileName) throw new ApiError('Nombre de archivo inválido', 400);

  const filePath = path.join(getCarpetaUtilidades(), fileName);
  if (!fs.existsSync(filePath)) {
    throw new ApiError('Archivo no encontrado', 404);
  }

  fs.unlinkSync(filePath);
  res.json({ message: 'Documento eliminado', nombre: fileName });
};
