import { getDiasNoLaborablesParaCalculo } from '../repositories/diasNoLaborablesRepository';
import { getPartesFechaLocal } from './finSemana';
import {
  DiasNoLaborables,
  calcularVencimientoSLA,
  diasNoLaborablesVacios,
  esDiaHabilPorFecha,
  esFueraDeHorario,
} from './horarioLaboralBase';

export {
  getHorarioFin,
  getHorarioInicio,
  esDiaNoLaborable,
  esFueraDeHorario,
} from './horarioLaboralBase';

let cache: { valor: DiasNoLaborables; expira: number } | null = null;
const CACHE_MS = 60 * 1000;

/** Feriados para los cálculos, con caché corta (60 s) para no consultar en cada mensaje. */
export const cargarDiasNoLaborables = async (
  forzar = false,
): Promise<DiasNoLaborables> => {
  const ahora = Date.now();
  if (!forzar && cache && cache.expira > ahora) return cache.valor;
  try {
    const valor = await getDiasNoLaborablesParaCalculo();
    cache = { valor, expira: ahora + CACHE_MS };
    return valor;
  } catch (err) {
    console.error(
      '[HorarioLaboral] No se pudieron cargar los feriados:',
      err instanceof Error ? err.message : err,
    );
    return cache?.valor || diasNoLaborablesVacios();
  }
};

export const invalidarCacheDiasNoLaborables = () => {
  cache = null;
};

/** True si ahora es un día hábil (lunes-viernes y no feriado), sin mirar la hora. */
export const esDiaHabilAhora = async (): Promise<boolean> => {
  const dias = await cargarDiasNoLaborables();
  const { ymd } = getPartesFechaLocal();
  const [anio, mes, dia] = ymd.split('-').map(Number);
  return esDiaHabilPorFecha(anio, mes, dia, dias);
};

/** True si ahora está fuera del horario laboral (noche, fin de semana o feriado). */
export const esFueraDeHorarioAhora = async (): Promise<boolean> => {
  const dias = await cargarDiasNoLaborables();
  return esFueraDeHorario(new Date(), dias);
};

/** Vencimiento del SLA para una asignación/reasignación hecha en `desde`. */
export const calcularVencimientoSLAActual = async (
  desde: Date = new Date(),
): Promise<Date> => {
  const dias = await cargarDiasNoLaborables();
  return calcularVencimientoSLA(desde, dias);
};
