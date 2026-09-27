import {
  getCampanas,
  getCampanaById,
  getCampanaPorPalabra,
  createCampana,
  updateCampana,
  deleteCampana,
} from '../repositories/campanasRepository';
import { ApiError } from '../utils/ApiError';

const normalizar = (texto: string) => texto.trim().toLowerCase();

export const getCampanasService = async () => {
  return await getCampanas();
};

export const createCampanaService = async (data: { palabra_clave?: string; descripcion?: string }) => {
  const palabra = data.palabra_clave?.trim();
  if (!palabra) throw new ApiError('La palabra clave es obligatoria', 400);

  const existente = await getCampanaPorPalabra(palabra);
  if (existente) throw new ApiError('Ya existe una campaña con esa palabra clave', 400);

  return await createCampana({
    palabra_clave: palabra,
    descripcion: data.descripcion?.trim() || null,
    activa: true,
  });
};

export const updateCampanaService = async (
  id: string,
  data: { palabra_clave?: string; descripcion?: string; activa?: boolean },
) => {
  const campana = await getCampanaById(id);
  if (!campana) throw new ApiError('Campaña no encontrada', 404);

  const campos: Partial<{ palabra_clave: string; descripcion: string | null; activa: boolean }> = {};

  if (data.palabra_clave !== undefined) {
    const palabra = data.palabra_clave.trim();
    if (!palabra) throw new ApiError('La palabra clave es obligatoria', 400);
    if (normalizar(palabra) !== normalizar(campana.palabra_clave)) {
      const existente = await getCampanaPorPalabra(palabra);
      if (existente && existente.id !== id) {
        throw new ApiError('Ya existe una campaña con esa palabra clave', 400);
      }
    }
    campos.palabra_clave = palabra;
  }

  if (data.descripcion !== undefined) {
    campos.descripcion = data.descripcion?.trim() || null;
  }

  if (data.activa !== undefined) {
    if (typeof data.activa !== 'boolean') throw new ApiError('activa debe ser un booleano', 400);
    campos.activa = data.activa;
  }

  if (!Object.keys(campos).length) throw new ApiError('No hay campos para actualizar', 400);

  return await updateCampana(id, campos);
};

export const deleteCampanaService = async (id: string) => {
  const campana = await getCampanaById(id);
  if (!campana) throw new ApiError('Campaña no encontrada', 404);
  return await deleteCampana(id);
};
