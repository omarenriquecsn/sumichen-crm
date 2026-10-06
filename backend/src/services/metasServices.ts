import { Meta } from '../entities/Metas';
import {
  getMetas,
  getMetaById,
  getMetaPorVendedorMesAnio,
  createMeta,
  updateMeta,
  deleteMeta,
} from '../repositories/metasRepository';

export const getMetasService = async () => {
  const metas = await getMetas();
  return metas;
};

export const getMetasByIdService = async (id: string, rol: string, ano?: string) => {
  if (rol === 'admin') {
    const metas = await getMetas();
    return metas;
  }

  const meta = await getMetaById(id);
  return meta;
};

export const createMetasService = async (metaData: Partial<Meta>) => {
  if (!metaData.vendedor_id)
    throw new Error('No se ha proporcionado un vendedor');
  if (!metaData.mes) throw new Error('No se ha proporcionado un mes');

  const ano = metaData.ano ?? new Date().getFullYear();

  // Upsert: si ya existe una meta de ese vendedor/mes/año, la sustituye;
  // si no, la crea. Así "la meta más nueva reemplaza a la anterior del mes".
  const existente = await getMetaPorVendedorMesAnio(
    metaData.vendedor_id,
    metaData.mes,
    ano,
  );

  if (existente) {
    return await updateMeta(existente.id, { ...metaData, ano });
  }

  return await createMeta({ ...metaData, ano });
};

export const updateMetasClientesService = async (
  id: string,
  valor: number,
  mes: number,
  rol: string
) => {
  const metas = await getMetasByIdService(id, rol);


};

export const updateMetasService = async (
  id: string,
  metaData: Partial<Meta>,
) => {
  const metaActualizada = await updateMeta(id, metaData);
  return metaActualizada;
};

export const deleteMetasService = async (id: string) => {
  const metaBorrada = await deleteMeta(id);
  return metaBorrada;
};
