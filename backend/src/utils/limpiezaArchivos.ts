import fs from 'fs';
import path from 'path';

/**
 * Utilidades de limpieza de archivos en disco (evidencias, exports, etc.).
 */

export interface ResultadoLimpiezaArchivos {
  dir: string;
  attempted: number;
  deleted: number;
  errors: string[];
}

/** Carpeta de evidencias de pedidos (configurable con EVIDENCIA_UPLOAD_PATH). */
export const getEvidenciasDir = (): string =>
  process.env.EVIDENCIA_UPLOAD_PATH ||
  path.resolve(__dirname, '..', '..', 'uploads', 'evidencias');

/** Carpeta de XLSX generados por las descargas. */
export const getExportsDir = (): string =>
  process.env.EXPORTS_UPLOAD_PATH ||
  path.resolve(__dirname, '..', '..', 'exports');

/**
 * Borra los archivos de `dir` cuyo `mtime` sea anterior a `dias` días.
 */
export const borrarArchivosAntiguos = (
  dir: string,
  dias: number,
): ResultadoLimpiezaArchivos => {
  const resultado: ResultadoLimpiezaArchivos = {
    dir,
    attempted: 0,
    deleted: 0,
    errors: [],
  };

  if (!dir || !fs.existsSync(dir)) return resultado;

  const threshold = Date.now() - dias * 24 * 60 * 60 * 1000;

  for (const nombre of fs.readdirSync(dir)) {
    const filePath = path.join(dir, nombre);
    try {
      const st = fs.statSync(filePath);
      if (!st.isFile()) continue;
      resultado.attempted++;
      if (st.mtimeMs < threshold) {
        fs.unlinkSync(filePath);
        resultado.deleted++;
      }
    } catch (e) {
      resultado.errors.push(`${nombre}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return resultado;
};

/**
 * Borra una lista de nombres de archivo dentro de `dir` (ignora los que no existan).
 * Acepta solo el nombre base (se protege contra rutas).
 */
export const borrarArchivosPorNombre = (
  dir: string,
  nombres: string[],
): ResultadoLimpiezaArchivos => {
  const resultado: ResultadoLimpiezaArchivos = {
    dir,
    attempted: 0,
    deleted: 0,
    errors: [],
  };

  if (!dir || !fs.existsSync(dir)) return resultado;

  for (const nombre of nombres) {
    if (!nombre) continue;
    const base = path.basename(nombre);
    const filePath = path.join(dir, base);
    try {
      if (fs.existsSync(filePath)) {
        resultado.attempted++;
        fs.unlinkSync(filePath);
        resultado.deleted++;
      }
    } catch (e) {
      resultado.errors.push(`${base}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return resultado;
};
