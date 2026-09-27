import { AppDataSource } from '../config/dataBaseConfig';
import { Campana } from '../entities/Campana';

export const getCampanas = async (filtros?: { activa?: boolean }) => {
  const repo = AppDataSource.getRepository(Campana);
  const where = filtros?.activa === undefined ? {} : { activa: filtros.activa };
  return await repo.find({ where, order: { fecha_creacion: 'ASC' } });
};

export const getCampanaById = async (id: string) => {
  const repo = AppDataSource.getRepository(Campana);
  return await repo.findOne({ where: { id } });
};

export const getCampanaPorPalabra = async (palabraClave: string) => {
  const repo = AppDataSource.getRepository(Campana);
  return await repo.findOne({ where: { palabra_clave: palabraClave } });
};

export const createCampana = async (data: Partial<Campana>) => {
  const repo = AppDataSource.getRepository(Campana);
  const campana = repo.create(data);
  return await repo.save(campana);
};

export const updateCampana = async (id: string, data: Partial<Campana>) => {
  const repo = AppDataSource.getRepository(Campana);
  await repo.update(id, data);
  return await repo.findOne({ where: { id } });
};

export const deleteCampana = async (id: string) => {
  const repo = AppDataSource.getRepository(Campana);
  return await repo.delete(id);
};
