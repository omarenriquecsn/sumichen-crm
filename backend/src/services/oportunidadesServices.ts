import { Oportunidad } from '../entities/Oportunidades';
import {
  getOportunidads,
  getOportunidadById,
  createOportunidad,
  updateOportunidad,
  deleteOportunidad,
} from '../repositories/oportunidadesRepository';

export const getOportunidadesService = async () => {
  const oportunidades = await getOportunidads();
  return oportunidades;
};

export const createOportunidadesService = async (
  oportunidadData: Oportunidad,
) => {
  const nuevaOportunidad = await createOportunidad(oportunidadData);
  return nuevaOportunidad;
};

export const getOportunidadesByIdService = async (id: string, rol: string) => {
  if (rol === 'admin') {
    const oportunidades = await getOportunidads();
    return oportunidades;
  }
  const oportunidades = await getOportunidadById(id);
  return oportunidades;
};

export const updateOportunidadesService = async (
  id: string,
  oportunidadData: Partial<Oportunidad>,
) => {
  const oportunidadActualizada = await updateOportunidad(id, oportunidadData);
  return oportunidadActualizada;
};

export const deleteOportunidadesService = async (id: string) => {
  const oportunidadBorrada = await deleteOportunidad(id);
  return oportunidadBorrada;
};
