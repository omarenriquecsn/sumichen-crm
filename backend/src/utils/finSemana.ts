/**
 * Utilidades de fecha/hora para el flujo de fin de semana del asistente.
 *
 * ⚠ IMPORTANTE: la decisión de "es fin de semana" y la hora de reanudación NO
 * dependen de la zona horaria del sistema operativo del servidor (que en el VPS
 * puede estar en UTC). Siempre se calculan con `Intl.DateTimeFormat` usando una
 * zona explícita (`WEEKEND_TZ`, por defecto `America/Caracas`). Así un sábado
 * 01:00 UTC (viernes 21:00 en Venezuela) se evalúa correctamente como viernes.
 */

export const getZonaHoraria = () => process.env.WEEKEND_TZ || 'America/Caracas';

export interface PartesFechaLocal {
  anio: number;
  mes: string;
  dia: string;
  /** Fecha local en formato YYYY-MM-DD (para comparar "el mismo día"). */
  ymd: string;
  hora: number;
  minuto: number;
  /** Día de la semana en inglés corto: Mon, Tue, Wed, Thu, Fri, Sat, Sun. */
  weekday: string;
}

export const getPartesFechaLocal = (fecha: Date = new Date()): PartesFechaLocal => {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: getZonaHoraria(),
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  const parts: Record<string, string> = {};
  for (const p of fmt.formatToParts(fecha)) {
    if (p.type !== 'literal') parts[p.type] = p.value;
  }

  return {
    anio: Number(parts.year),
    mes: parts.month,
    dia: parts.day,
    ymd: `${parts.year}-${parts.month}-${parts.day}`,
    hora: Number(parts.hour),
    minuto: Number(parts.minute),
    weekday: parts.weekday,
  };
};

export const esFinDeSemana = (fecha: Date = new Date()): boolean => {
  const { weekday } = getPartesFechaLocal(fecha);
  return weekday === 'Sat' || weekday === 'Sun';
};

/** Resumen legible de la hora del servidor y de la zona del feature (diagnóstico). */
export const resumenHora = (fecha: Date = new Date()) => {
  const local = getPartesFechaLocal(fecha);
  const hh = String(local.hora).padStart(2, '0');
  const mm = String(local.minuto).padStart(2, '0');
  return {
    serverTime: fecha.toISOString(),
    serverTz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    zonaFeature: getZonaHoraria(),
    horaLocal: `${local.ymd} ${hh}:${mm} (${local.weekday})`,
    esFinDeSemana: local.weekday === 'Sat' || local.weekday === 'Sun',
  };
};
