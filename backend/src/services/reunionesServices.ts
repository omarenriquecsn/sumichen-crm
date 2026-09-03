import { Actividad } from '../entities/Actividades';
import { Reunion } from '../entities/Reuniones';
import { ActividadesEnum } from '../enums/ActividadesEnum';
import {
  getReunions,
  getReunionById,
  createReunion,
  updateReunion,
  deleteReunion,
} from '../repositories/reunionesRepository';
import {
  createActividadesService,
  getActividadesByIdService,
  updateActividadesService,
} from './actividadesServices';
import { getActividads, updateActividad } from '../repositories/actividadesRepository';

export const getReunionesService = async () => {
  const reunions = await getReunions();
  return reunions;
};

export const getReunionesByVendedorService = async (id: string) => {
  const reuniones = await getReunions();
  return reuniones.filter((reunion) => reunion.vendedor_id === id);
};

export const getReunionesByIdService = async (id: string, rol: string) => {
  if(rol === 'admin'){
    const reunion = await getReunionesService();
    return reunion;
  }
  const reunion = await getReunionById(id);
  return reunion;
};

export const createReunionesService = async (ReunionData: Partial<Reunion>) => {
  const neuvaReunion = await createReunion(ReunionData);

  if (neuvaReunion === null) throw new Error('No se pudo crear la reunion');

  const newActividad: Partial<Actividad> = {
    titulo: neuvaReunion.titulo,
    descripcion: neuvaReunion.descripcion,
    cliente_id: neuvaReunion.cliente_id,
    vendedor_id: neuvaReunion.vendedor_id,
    fecha: neuvaReunion.fecha_inicio,
    tipo: ActividadesEnum.REUNION,
    fecha_vencimiento: neuvaReunion.fecha_fin,
    id_tipo_actividad: neuvaReunion.id,
  };

  await createActividadesService(newActividad);
  return neuvaReunion;
};

export const updateReunionesService = async (
  id: string,
  reunionData: Partial<Reunion>,
  rol: string,
) => {
  const reunionActualizada = await updateReunion(id, reunionData);

  if (!reunionActualizada) throw new Error('No se pudo actualizar la reunion');

  // Al reagendar (cambiar fecha_inicio/fecha_fin) se sincroniza la Actividad
  // ligada que el backend crea automáticamente por cada reunión, para que las
  // listas del dashboard y el recordatorio reflejen la nueva fecha.
  if (
    reunionData.fecha_inicio !== undefined ||
    reunionData.fecha_fin !== undefined
  ) {
    const todasActividades = await getActividads();
    const actividadEnlazada = todasActividades.find(
      (a) =>
        a.id_tipo_actividad === reunionActualizada.id &&
        a.tipo === ActividadesEnum.REUNION,
    );
    if (actividadEnlazada) {
      await updateActividad(actividadEnlazada.id, {
        fecha: reunionActualizada.fecha_inicio,
        fecha_vencimiento: reunionActualizada.fecha_fin,
        recordatorio_enviado: false,
      });
    }
  }

  if (reunionActualizada.estado === 'completada') {
    const allActividades = await getActividadesByIdService(
      reunionActualizada.vendedor_id,
      rol,
    );
    console.log(reunionActualizada);

    const actividadActualizada = allActividades.find(
      (actividad) =>
        actividad.cliente_id === reunionActualizada.cliente_id &&
      actividad.titulo === reunionActualizada.titulo &&
      new Date(actividad.fecha_creacion).getDate() ===
      new Date(reunionActualizada.fecha_creacion).getDate() &&
      actividad.tipo === ActividadesEnum.REUNION
    ) ?? allActividades.find(
      (actividad) =>
        actividad.id_tipo_actividad === reunionActualizada.id &&
        actividad.tipo === ActividadesEnum.REUNION
    );
    
    if (!actividadActualizada) {
      throw new Error('No se pudo actualizar la actividad');
    }
    await updateActividadesService(actividadActualizada.id, {
      completado: true,
    });
  }

  return reunionActualizada;
};

export const deleteReunionesService = async (id: string) => {
  const reunionBorrada = await deleteReunion(id);
  return reunionBorrada;
};
