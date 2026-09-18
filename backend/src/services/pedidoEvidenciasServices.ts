import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { lookup } from 'mime-types';
import { ApiError } from '../utils/ApiError';
import { Pedido } from '../entities/Pedidos';
import { PedidoEvidencia } from '../entities/PedidoEvidencia';
import { AppDataSource } from '../config/dataBaseConfig';
import { getEvidenciasDir } from '../utils/limpiezaArchivos';
import {
  crearEvidencia,
  listarEvidenciasPorPedido,
  buscarEvidenciaPorId,
  eliminarEvidencia,
} from '../repositories/pedidoEvidenciasRepository';

type ReqUser = {
  id?: string;
  rol?: 'admin' | 'vendedor';
  vendedor_db_id?: string;
};

const baseApiUrl = () =>
  process.env.PUBLIC_API_URL || 'https://crmsumichen.com/api';

/**
 * Genera un nombre de archivo único y seguro en disco (sin rutas del cliente).
 * Ej: `pedido_<id>_<timestamp>_<rand>.pdf`.
 */
const nombreArchivoSeguro = (pedidoId: string, originalname: string) => {
  const ext = path
    .extname(originalname)
    .toLowerCase()
    .replace(/[^.a-z0-9]/g, '');
  const random = crypto.randomBytes(4).toString('hex');
  return `pedido_${pedidoId}_${Date.now()}_${random}${ext}`;
};

/**
 * Guarda los archivos ORIGINALES de un pedido (sin convertir). Procesa cada
 * archivo de forma independiente: si uno falla, los demás igual se guardan.
 */
export const guardarEvidenciasService = async (
  pedidoId: string,
  files: Express.Multer.File[],
  subidoPorId?: string,
) => {
  const pedido = await AppDataSource.getRepository(Pedido).findOneBy({
    id: pedidoId,
  });
  if (!pedido) throw new ApiError('Pedido no encontrado', 404);

  const dir = getEvidenciasDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const evidencias: PedidoEvidencia[] = [];
  const fallidos: { nombre: string; error: string }[] = [];

  for (const file of files) {
    try {
      const archivoNombre = nombreArchivoSeguro(pedidoId, file.originalname);
      fs.writeFileSync(path.join(dir, archivoNombre), file.buffer);

      const mime =
        file.mimetype || (lookup(file.originalname) as string) || null;

      const creada = await crearEvidencia({
        pedido_id: pedidoId,
        nombre_original: file.originalname,
        archivo_nombre: archivoNombre,
        mime,
        tamano: file.size,
        url: `${baseApiUrl()}/uploads/${archivoNombre}`,
        subido_por_id: subidoPorId ?? null,
      });
      evidencias.push(creada);
    } catch (e) {
      fallidos.push({
        nombre: file.originalname,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return { evidencias, fallidos };
};

export const getEvidenciasService = async (pedidoId: string) => {
  const pedido = await AppDataSource.getRepository(Pedido).findOneBy({
    id: pedidoId,
  });
  if (!pedido) throw new ApiError('Pedido no encontrado', 404);
  return await listarEvidenciasPorPedido(pedidoId);
};

export const eliminarEvidenciaService = async (
  pedidoId: string,
  evidenciaId: string,
  reqUser: ReqUser,
) => {
  const pedido = await AppDataSource.getRepository(Pedido).findOneBy({
    id: pedidoId,
  });
  if (!pedido) throw new ApiError('Pedido no encontrado', 404);

  // Solo un administrador puede eliminar evidencias de un pedido ya creado.
  if (reqUser.rol !== 'admin') {
    throw new ApiError(
      'Solo un administrador puede eliminar evidencias',
      403,
    );
  }

  const evidencia = await buscarEvidenciaPorId(evidenciaId);
  if (!evidencia || evidencia.pedido_id !== pedidoId) {
    throw new ApiError('Evidencia no encontrada', 404);
  }

  await eliminarEvidencia(evidenciaId);
  try {
    fs.unlinkSync(
      path.join(getEvidenciasDir(), path.basename(evidencia.archivo_nombre)),
    );
  } catch {
    // Si el archivo ya no está en disco, la fila igual queda eliminada.
  }

  return { ok: true };
};

/**
 * Borra los archivos de disco de todas las evidencias de un pedido.
 * Las filas se eliminan por CASCADE al borrar el pedido.
 * Se usa en `deletePedidosService` (antes de borrar el pedido).
 */
export const eliminarEvidenciasDePedidoService = async (pedidoId: string) => {
  const evidencias = await listarEvidenciasPorPedido(pedidoId);
  const dir = getEvidenciasDir();
  for (const ev of evidencias) {
    try {
      fs.unlinkSync(path.join(dir, path.basename(ev.archivo_nombre)));
    } catch {
      // ignorar
    }
  }
  return evidencias.length;
};
