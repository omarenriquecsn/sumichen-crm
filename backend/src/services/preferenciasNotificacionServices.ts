import {
  obtenerPreferenciasRepository,
  upsertPreferenciasRepository,
} from '../repositories/preferenciasNotificacionRepository';
import { EventoNotificacionEnum } from '../enums/EventoNotificacionEnum';

/** Todos los eventos conocidos, con su estado (default habilitado si no hay fila). */
export const obtenerPreferenciasService = async (vendedorDbId: string) => {
  const prefs = await obtenerPreferenciasRepository(vendedorDbId);
  const mapa = new Map(prefs.map((p) => [p.evento, p.habilitado]));
  return Object.values(EventoNotificacionEnum).map((evento) => ({
    evento,
    habilitado: mapa.get(evento) ?? true,
  }));
};

export const guardarPreferenciasService = async (
  vendedorDbId: string,
  preferencias: { evento: string; habilitado: boolean }[],
) => {
  const validos = new Set(Object.values(EventoNotificacionEnum));
  const limpias = (preferencias || []).filter(
    (p) => p && validos.has(p.evento as any) && typeof p.habilitado === 'boolean',
  );
  return await upsertPreferenciasRepository(vendedorDbId, limpias);
};
