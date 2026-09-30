import { AppDataSource } from '../config/dataBaseConfig';
import { PreferenciaNotificacion } from '../entities/PreferenciaNotificacion';
import { In } from 'typeorm';

const PreferenciaRepo = () => AppDataSource.getRepository(PreferenciaNotificacion);

export const obtenerPreferenciasRepository = async (vendedorDbId: string) => {
  // Sin id de vendedor NO se puede filtrar: TypeORM ignora las condiciones
  // `undefined` en `where` y devolvería las filas de TODOS los usuarios.
  if (!vendedorDbId) return [];
  return await PreferenciaRepo().find({ where: { vendedor_id: vendedorDbId } });
};

/** Preferencias de varios vendedores (para envíos masivos, un solo query). */
export const obtenerPreferenciasDeVendedoresRepository = async (vendedorDbIds: string[]) => {
  const ids = (vendedorDbIds || []).filter((id) => !!id);
  if (!ids.length) return [];
  return await PreferenciaRepo().find({
    where: { vendedor_id: In(ids) },
    select: ['vendedor_id', 'evento', 'habilitado'],
  });
};

/**
 * Reemplaza las preferencias de un vendedor por las indicadas (upsert batch).
 * `preferencias` = [{ evento, habilitado }]. Si viene vacío, no borra nada
 * (todas quedan en su default true).
 */
export const upsertPreferenciasRepository = async (
  vendedorDbId: string,
  preferencias: { evento: string; habilitado: boolean }[],
) => {
  // Sin id de vendedor, abortar: un `where` con `undefined` abarcaría a todos.
  if (!vendedorDbId) return [];
  if (!preferencias.length) return await obtenerPreferenciasRepository(vendedorDbId);

  const repo = PreferenciaRepo();
  const actuales = await repo.find({ where: { vendedor_id: vendedorDbId } });

  // Mapa de los eventos a guardar
  const nuevos = new Map(preferencias.map((p) => [p.evento, p.habilitado]));

  // Filas a actualizar en DB (existentes que se mantienen)
  const aGuardar: PreferenciaNotificacion[] = [];
  // Eventos que no existen aún → se crean
  const existentes = new Map(actuales.map((a) => [a.evento, a]));
  const aCrear: { vendedor_id: string; evento: string; habilitado: boolean }[] = [];
  // Eventos existentes que ya no están en la lista → se eliminan (vuelven al default true)
  const aEliminar: string[] = [];

  for (const [evento, habilitado] of nuevos.entries()) {
    const existente = existentes.get(evento);
    if (existente) {
      existente.habilitado = habilitado;
      aGuardar.push(existente);
    } else {
      aCrear.push({ vendedor_id: vendedorDbId, evento, habilitado });
    }
  }
  for (const existente of actuales) {
    if (!nuevos.has(existente.evento)) aEliminar.push(existente.id);
  }

  if (aEliminar.length) await repo.delete(aEliminar.map((id) => ({ id })));
  if (aCrear.length) await repo.save(repo.create(aCrear));
  if (aGuardar.length) await repo.save(aGuardar);

  return await obtenerPreferenciasRepository(vendedorDbId);
};

/** ¿El vendedor tiene habilitado este evento? (default: true si no hay fila). */
export const eventoHabilitadoRepository = async (vendedorDbId: string, evento: string) => {
  if (!vendedorDbId) return false;
  const pref = await PreferenciaRepo().findOneBy({ vendedor_id: vendedorDbId, evento });
  if (!pref) return true; // default habilitado
  return pref.habilitado;
};
