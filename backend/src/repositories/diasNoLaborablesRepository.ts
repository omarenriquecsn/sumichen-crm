import { AppDataSource } from '../config/dataBaseConfig';
import { DiaNoLaborable } from '../entities/DiaNoLaborable';
import { DiasNoLaborables } from '../utils/horarioLaboralBase';

const getRepo = () => AppDataSource.getRepository(DiaNoLaborable);

const fechaTexto = (fecha: string | Date): string =>
  typeof fecha === 'string'
    ? fecha.slice(0, 10)
    : new Date(fecha).toISOString().slice(0, 10);

export const getDiasNoLaborables = async (): Promise<DiaNoLaborable[]> => {
  return await getRepo().find({ order: { fecha: 'ASC' } });
};

export const getDiasNoLaborablesParaCalculo =
  async (): Promise<DiasNoLaborables> => {
    const filas = await getRepo().find({
      select: ['fecha', 'recurrente_anual'],
    });
    const exactas = new Set<string>();
    const recurrentes = new Set<string>();
    for (const fila of filas) {
      const texto = fechaTexto(fila.fecha);
      if (fila.recurrente_anual) recurrentes.add(texto.slice(5));
      else exactas.add(texto);
    }
    return { exactas, recurrentes };
  };

export const getDiaNoLaborablePorFecha = async (fecha: string) => {
  return await getRepo().findOne({ where: { fecha } });
};

export const createDiaNoLaborable = async (data: Partial<DiaNoLaborable>) => {
  const repo = getRepo();
  const nuevo = repo.create(data);
  return await repo.save(nuevo);
};

export const deleteDiaNoLaborable = async (id: string) => {
  return await getRepo().delete(id);
};
