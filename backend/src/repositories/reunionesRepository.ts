import { AppDataSource } from '../config/dataBaseConfig';
import { EstadoReunionEnum } from '../enums/EstadoReunionEnum';
import { Reunion } from '../entities/Reuniones';

export const getReunions = async () => {
  const ReunionRepository = AppDataSource.getRepository(Reunion);
  return await ReunionRepository.find({
    order: { fecha_creacion: 'DESC' },
  });
};

export const getReunionById = async (id: string) => {
  const ReunionRepository = AppDataSource.getRepository(Reunion);
  return await ReunionRepository.find({
    where: { vendedor_id: id },
    relations: ['cliente'],
    order: { fecha_creacion: 'DESC' },
  });
};

export const createReunion = async (ReunionData: Partial<Reunion>) => {
  const ReunionRepository = AppDataSource.getRepository(Reunion);
  const newReunion = ReunionRepository.create(ReunionData);
  return await ReunionRepository.save(newReunion);
};

export const updateReunion = async (
  id: string,
  ReunionData: Partial<Reunion>,
) => {
  const ReunionRepository = AppDataSource.getRepository(Reunion);
  await ReunionRepository.update(id, ReunionData);
  return await ReunionRepository.findOneBy({ id });
};

export const deleteReunion = async (id: string) => {
  const ReunionRepository = AppDataSource.getRepository(Reunion);
  return await ReunionRepository.delete(id);
};
