import { AppDataSource } from '../config/dataBaseConfig';
import { Meta } from '../entities/Metas';

export const getMetas = async () => {
  const MetaRepository = AppDataSource.getRepository(Meta);
  return await MetaRepository.find({ order: { mes: 'ASC' } });
};

export const getMetaById = async (id: string) => {
  const MetaRepository = AppDataSource.getRepository(Meta);
  return await MetaRepository.find({ where: { vendedor_id: id, ano: new Date().getFullYear()} });
};

export const createMeta = async (MetaData: Partial<Meta>) => {
  const MetaRepository = AppDataSource.getRepository(Meta);
  const newMeta = MetaRepository.create(MetaData);
  return await MetaRepository.save(newMeta);
};

export const updateMeta = async (id: string, MetaData: Partial<Meta>) => {
  const MetaRepository = AppDataSource.getRepository(Meta);
  await MetaRepository.update(id, MetaData);
  return await MetaRepository.findOneBy({ id });
};

export const deleteMeta = async (id: string) => {
  const MetaRepository = AppDataSource.getRepository(Meta);
  return await MetaRepository.delete(id);
};
