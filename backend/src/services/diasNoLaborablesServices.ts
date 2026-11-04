import {
  createDiaNoLaborable,
  deleteDiaNoLaborable,
  getDiaNoLaborablePorFecha,
  getDiasNoLaborables,
} from '../repositories/diasNoLaborablesRepository';
import { ApiError } from '../utils/ApiError';
import { invalidarCacheDiasNoLaborables } from '../utils/horarioLaboral';

interface FechaPartes {
  anio: number;
  mes: number;
  dia: number;
}

const parsearFecha = (valor: string): FechaPartes | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor.trim());
  if (!match) return null;
  const anio = Number(match[1]);
  const mes = Number(match[2]);
  const dia = Number(match[3]);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  if (
    fecha.getUTCFullYear() !== anio ||
    fecha.getUTCMonth() + 1 !== mes ||
    fecha.getUTCDate() !== dia
  ) {
    return null;
  }
  return { anio, mes, dia };
};

const dosDigitos = (n: number) => String(n).padStart(2, '0');

export const getDiasNoLaborablesService = async () => {
  return await getDiasNoLaborables();
};

export const createDiaNoLaborableService = async (data: {
  fecha?: string;
  descripcion?: string;
  recurrente_anual?: boolean;
}) => {
  if (!data.fecha || typeof data.fecha !== 'string') {
    throw new ApiError('La fecha es obligatoria (YYYY-MM-DD)', 400);
  }
  const partes = parsearFecha(data.fecha);
  if (!partes) {
    throw new ApiError('La fecha debe tener el formato YYYY-MM-DD y ser válida', 400);
  }

  const recurrente = data.recurrente_anual === true;
  // Para los recurrentes se guarda un año de referencia fijo (2000) y la
  // comparación real se hace por mes-día.
  const fecha = recurrente
    ? `2000-${dosDigitos(partes.mes)}-${dosDigitos(partes.dia)}`
    : `${partes.anio}-${dosDigitos(partes.mes)}-${dosDigitos(partes.dia)}`;

  const existente = await getDiaNoLaborablePorFecha(fecha);
  if (existente) {
    throw new ApiError(
      recurrente
        ? 'Ya existe un día no laborable recurrente para esa fecha'
        : 'Ya existe un día no laborable para esa fecha',
      400,
    );
  }

  const descripcion = data.descripcion?.trim() || null;
  if (descripcion && descripcion.length > 255) {
    throw new ApiError('La descripción no puede superar los 255 caracteres', 400);
  }

  const creado = await createDiaNoLaborable({
    fecha,
    descripcion,
    recurrente_anual: recurrente,
  });
  invalidarCacheDiasNoLaborables();
  return creado;
};

export const deleteDiaNoLaborableService = async (id: string) => {
  const resultado = await deleteDiaNoLaborable(id);
  if (!resultado.affected) throw new ApiError('Día no laborable no encontrado', 404);
  invalidarCacheDiasNoLaborables();
  return { ok: true };
};
