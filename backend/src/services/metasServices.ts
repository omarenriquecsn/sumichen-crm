import { Meta } from '../entities/Metas';
import {
  getMetas,
  getMetaById,
  createMeta,
  updateMeta,
  deleteMeta,
} from '../repositories/metasRepository';
import { getPedidosByVendedorService } from './pedidosServices';
import { getClientesVendedorService } from './clientesServices';

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
  const vendedorPedidos = await getPedidosByVendedorService(
    metaData.vendedor_id,
  );

  const metaActualizada = {
    ...metaData,
  };
  const nuevaMeta = await createMeta(metaActualizada);

  return nuevaMeta;
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
