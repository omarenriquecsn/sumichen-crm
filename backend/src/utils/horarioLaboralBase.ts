import { getPartesFechaLocal, getZonaHoraria } from './finSemana';

/**
 * Utilidades puras de horario laboral (sin acceso a base de datos).
 *
 * Horario: lunes a viernes, `HORARIO_INICIO` (default 8) a `HORARIO_FIN`
 * (default 17), en la zona `WEEKEND_TZ` (default America/Caracas). Los
 * feriados se reciben como dos sets: fechas exactas (`YYYY-MM-DD`) y
 * recurrentes anuales (`MM-DD`).
 *
 * Se separa de `horarioLaboral.ts` para poder importarla desde las migraciones
 * sin arrastrar el DataSource.
 */

export interface DiasNoLaborables {
  /** Fechas exactas en formato YYYY-MM-DD. */
  exactas: Set<string>;
  /** Fechas anuales en formato MM-DD. */
  recurrentes: Set<string>;
}

export const diasNoLaborablesVacios = (): DiasNoLaborables => ({
  exactas: new Set<string>(),
  recurrentes: new Set<string>(),
});

const numeroEnv = (valor: string | undefined, defecto: number) => {
  const n = parseInt(valor || '', 10);
  return Number.isFinite(n) ? n : defecto;
};

export const getHorarioInicio = () => numeroEnv(process.env.HORARIO_INICIO, 8);
export const getHorarioFin = () => numeroEnv(process.env.HORARIO_FIN, 17);

const dosDigitos = (n: number) => String(n).padStart(2, '0');

const formatearYmd = (anio: number, mes: number, dia: number) =>
  `${anio}-${dosDigitos(mes)}-${dosDigitos(dia)}`;

const diaSemanaDeFecha = (anio: number, mes: number, dia: number) =>
  new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay();

export const esDiaNoLaborable = (
  ymd: string,
  dias: DiasNoLaborables,
): boolean => dias.exactas.has(ymd) || dias.recurrentes.has(ymd.slice(5));

export const esDiaHabilPorFecha = (
  anio: number,
  mes: number,
  dia: number,
  dias: DiasNoLaborables,
): boolean => {
  const diaSemana = diaSemanaDeFecha(anio, mes, dia);
  if (diaSemana === 0 || diaSemana === 6) return false;
  return !esDiaNoLaborable(formatearYmd(anio, mes, dia), dias);
};

/** True si la fecha cae fuera del horario laboral (noche, fin de semana o feriado). */
export const esFueraDeHorario = (
  fecha: Date = new Date(),
  dias: DiasNoLaborables = diasNoLaborablesVacios(),
): boolean => {
  const partes = getPartesFechaLocal(fecha);
  const [anio, mes, dia] = partes.ymd.split('-').map(Number);
  if (!esDiaHabilPorFecha(anio, mes, dia, dias)) return true;
  const hora = partes.hora;
  return hora < getHorarioInicio() || hora >= getHorarioFin();
};

/**
 * Calcula el vencimiento del SLA: el siguiente día hábil (fecha estrictamente
 * posterior a la fecha local de `desde`) a la misma hora, ajustada al rango
 * 8-17. Si `desde` cae fuera del horario, el siguiente día hábil se busca de
 * todos modos y la hora se ajusta al límite.
 *
 * Ejemplos:
 * - lunes 09:00   -> martes 09:00
 * - viernes 16:00 -> lunes 16:00
 * - viernes 18:00 -> lunes 17:00
 * - sábado 14:00  -> lunes 14:00
 * - lunes 07:00   -> martes 08:00
 */
export const calcularVencimientoSLA = (
  desde: Date = new Date(),
  dias: DiasNoLaborables = diasNoLaborablesVacios(),
): Date => {
  const partes = getPartesFechaLocal(desde);
  const [anio, mes, dia] = partes.ymd.split('-').map(Number);
  const inicio = getHorarioInicio();
  const fin = getHorarioFin();

  let hora = partes.hora;
  let minuto = partes.minuto;
  if (hora < inicio) {
    hora = inicio;
    minuto = 0;
  } else if (hora > fin || (hora === fin && minuto > 0)) {
    hora = fin;
    minuto = 0;
  }

  for (let i = 1; i <= 3700; i++) {
    const siguiente = new Date(Date.UTC(anio, mes - 1, dia + i));
    const yy = siguiente.getUTCFullYear();
    const mm = siguiente.getUTCMonth() + 1;
    const dd = siguiente.getUTCDate();
    if (!esDiaHabilPorFecha(yy, mm, dd, dias)) continue;
    return fechaLocalAUtc(yy, mm, dd, hora, minuto);
  }

  // Fallback inalcanzable (más de 10 años sin días hábiles).
  return new Date(desde.getTime() + 24 * 60 * 60 * 1000);
};

/**
 * Convierte una fecha/hora "de pared" en la zona configurada a un `Date` UTC.
 * Se resuelve el offset con `Intl` y se corrige una segunda vez para cubrir
 * cambios de horario de verano en zonas que los tengan.
 */
export const fechaLocalAUtc = (
  anio: number,
  mes: number,
  dia: number,
  hora: number,
  minuto: number,
): Date => {
  const naiveUtc = Date.UTC(anio, mes - 1, dia, hora, minuto, 0, 0);
  const offset1 = getOffsetMs(new Date(naiveUtc));
  const conOffset1 = naiveUtc - offset1;
  const offset2 = getOffsetMs(new Date(conOffset1));
  return new Date(naiveUtc - offset2);
};

const getOffsetMs = (fecha: Date): number => {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: getZonaHoraria(),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  const parts: Record<string, string> = {};
  for (const p of fmt.formatToParts(fecha)) {
    if (p.type !== 'literal') parts[p.type] = p.value;
  }

  const comoUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return comoUtc - fecha.getTime();
};
