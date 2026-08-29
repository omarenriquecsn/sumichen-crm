import { AppDataSource } from '../config/dataBaseConfig';
import { Zona } from '../entities/Zona';

export const getZonas = async () => {
  const repo = AppDataSource.getRepository(Zona);
  return await repo.find({
    where: { activa: true },
    order: { nombre: 'ASC' },
    relations: ['vendedores', 'vendedores.vendedor'],
  });
};

export const getZonasParaExport = async () => {
  const repo = AppDataSource.getRepository(Zona);
  return await repo.find({
    order: { nombre: 'ASC' },
    relations: ['vendedores', 'vendedores.vendedor'],
  });
};

export const getZonaById = async (id: string) => {
  const repo = AppDataSource.getRepository(Zona);
  return await repo.findOne({ where: { id }, relations: ['vendedores', 'vendedores.vendedor'] });
};

export const createZona = async (data: Partial<Zona>) => {
  const repo = AppDataSource.getRepository(Zona);
  const zona = repo.create(data);
  return await repo.save(zona);
};

export const updateZona = async (id: string, data: Partial<Zona>) => {
  const repo = AppDataSource.getRepository(Zona);
  await repo.update(id, data);
  return await repo.findOne({ where: { id } });
};

export const deleteZona = async (id: string) => {
  const repo = AppDataSource.getRepository(Zona);
  return await repo.update(id, { activa: false });
};

export const asignarVendedorZona = async (zonaId: string, vendedorId: string) => {
  const repo = AppDataSource.getRepository('vendedor_zona');
  const existente = await repo.findOne({ where: { zona_id: zonaId, vendedor_id: vendedorId } });
  if (existente) return existente;
  return await repo.save({ zona_id: zonaId, vendedor_id: vendedorId });
};

export const desasignarVendedorZona = async (zonaId: string, vendedorId: string) => {
  const repo = AppDataSource.getRepository('vendedor_zona');
  return await repo.delete({ zona_id: zonaId, vendedor_id: vendedorId });
};

export const getVendedoresDeZona = async (zonaId: string) => {
  const repo = AppDataSource.getRepository('vendedor_zona');
  const vz = await repo.find({ where: { zona_id: zonaId }, relations: ['vendedor'] });
  return vz.map((v) => v.vendedor).filter((v) => v && v.activo);
};