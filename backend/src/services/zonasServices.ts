import {
  getZonas,
  getZonasParaExport,
  getZonaById,
  createZona,
  updateZona,
  deleteZona,
  asignarVendedorZona,
  desasignarVendedorZona,
  getVendedoresDeZona,
} from '../repositories/zonasRepository';
import { ApiError } from '../utils/ApiError';

export const getZonasService = async () => {
  return await getZonas();
};

export const getZonasParaExportService = async () => {
  return await getZonasParaExport();
};

export const getZonaByIdService = async (id: string) => {
  const zona = await getZonaById(id);
  if (!zona) throw new ApiError('Zona no encontrada', 404);
  return zona;
};

export const createZonaService = async (data: { nombre: string; descripcion?: string }) => {
  const nombre = data.nombre?.trim();
  if (!nombre) throw new ApiError('El nombre de la zona es obligatorio', 400);
  const existente = await getZonas();
  if (existente.find((z) => z.nombre.toLowerCase() === nombre.toLowerCase())) {
    throw new ApiError('Ya existe una zona con ese nombre', 400);
  }
  return await createZona({ ...data, activa: true });
};

export const updateZonaService = async (id: string, data: { nombre?: string; descripcion?: string; activa?: boolean }) => {
  const zona = await getZonaByIdService(id);
  const nuevoNombre = data.nombre?.trim();
  if (nuevoNombre && nuevoNombre !== zona.nombre) {
    const existentes = await getZonas();
    if (existentes.find((z) => z.nombre.toLowerCase() === nuevoNombre.toLowerCase())) {
      throw new ApiError('Ya existe una zona con ese nombre', 400);
    }
  }
  return await updateZona(id, data);
};

export const deleteZonaService = async (id: string) => {
  await getZonaByIdService(id);
  return await deleteZona(id);
};

export const asignarVendedorZonaService = async (zonaId: string, vendedorId: string) => {
  await getZonaByIdService(zonaId);
  return await asignarVendedorZona(zonaId, vendedorId);
};

export const desasignarVendedorZonaService = async (zonaId: string, vendedorId: string) => {
  await getZonaByIdService(zonaId);
  return await desasignarVendedorZona(zonaId, vendedorId);
};

export const getVendedoresDeZonaService = async (zonaId: string) => {
  await getZonaByIdService(zonaId);
  return await getVendedoresDeZona(zonaId);
};