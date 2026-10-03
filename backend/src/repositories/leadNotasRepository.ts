import { AppDataSource } from '../config/dataBaseConfig';
import { LeadNota } from '../entities/LeadNota';

/**
 * Notas (diario de negociación) de un lead, más antiguas primero para que el
 * timeline se lea cronológicamente.
 */
export const getNotasByLead = async (leadId: string) => {
  const repo = AppDataSource.getRepository(LeadNota);
  return await repo.find({
    where: { lead_id: leadId },
    relations: ['vendedor'],
    order: { fecha_creacion: 'ASC' },
  });
};

export const createNota = async (data: {
  lead_id: string;
  vendedor_id?: string | null;
  contenido: string;
}) => {
  const repo = AppDataSource.getRepository(LeadNota);
  const nota = repo.create({
    lead_id: data.lead_id,
    vendedor_id: data.vendedor_id ?? null,
    contenido: data.contenido,
  });
  const guardada = await repo.save(nota);
  return await repo.findOne({ where: { id: guardada.id }, relations: ['vendedor'] });
};

export const getNotaById = async (id: string) => {
  const repo = AppDataSource.getRepository(LeadNota);
  return await repo.findOne({ where: { id } });
};

export const deleteNota = async (id: string) => {
  const repo = AppDataSource.getRepository(LeadNota);
  return await repo.delete(id);
};
