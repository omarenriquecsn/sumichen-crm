import { AppDataSource } from '../config/dataBaseConfig';
import { Oportunidad } from '../entities/Oportunidades';

export const getOportunidads = async () => {
  const OportunidadRepository = AppDataSource.getRepository(Oportunidad);
  return await OportunidadRepository.find({
    order: { fecha_creacion: 'DESC' },
  });
};

export const getOportunidadById = async (id: string) => {
  const OportunidadRepository = AppDataSource.getRepository(Oportunidad);
  return await OportunidadRepository.find({ where: { vendedor_id: id } });
};

export const createOportunidad = async (
  OportunidadData: Partial<Oportunidad>,
) => {
  const OportunidadRepository = AppDataSource.getRepository(Oportunidad);
  const newOportunidad = OportunidadRepository.create(OportunidadData);
  return await OportunidadRepository.save(newOportunidad);
};

export const updateOportunidad = async (
  id: string,
  OportunidadData: Partial<Oportunidad>,
) => {
  if (!OportunidadData || Object.keys(OportunidadData).length === 0) {
    throw new Error(
      'No se proporcionaron datos para actualizar al Oportunidad.',
    );
  }

  const OportunidadRepository = AppDataSource.getRepository(Oportunidad);
  await OportunidadRepository.update(id, OportunidadData);
  return await OportunidadRepository.findOneBy({ id });
};

export const deleteOportunidad = async (id: string) => {
  const OportunidadRepository = AppDataSource.getRepository(Oportunidad);
  return await OportunidadRepository.delete(id);
};
