import { AppDataSource } from '../config/dataBaseConfig';
import { Actividad } from '../entities/Actividades';

export const getActividads = async () => {
  const ActividadRepository = AppDataSource.getRepository(Actividad);
  return await ActividadRepository.find({
    order: { fecha_creacion: 'DESC' },
  });
};

export const getActividadById = async (id: string) => {
  const ActividadRepository = AppDataSource.getRepository(Actividad);
  return await ActividadRepository.find({
    where: { vendedor_id: id },
    order: { fecha_creacion: 'DESC' },
  });
};

export const createActividad = async (ActividadData: Partial<Actividad>) => {
  const ActividadRepository = AppDataSource.getRepository(Actividad);
  const newActividad = ActividadRepository.create(ActividadData);
  return await ActividadRepository.save(newActividad);
};

export const updateActividad = async (
  id: string,
  ActividadData: Partial<Actividad>,
) => {
  if (!ActividadData || Object.keys(ActividadData).length === 0) {
    throw new Error('No se proporcionaron datos para actualizar al Actividad.');
  }
  const ActividadRepository = AppDataSource.getRepository(Actividad);
  await ActividadRepository.update(id, ActividadData);
  return await ActividadRepository.findOneBy({ id });
};

export const deleteActividad = async (id: string) => {
  const ActividadRepository = AppDataSource.getRepository(Actividad);
  return await ActividadRepository.delete(id);
};
