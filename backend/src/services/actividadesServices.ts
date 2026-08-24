import { Actividad } from '../entities/Actividades';
import { ActividadesEnum } from '../enums/ActividadesEnum';
import {
  getActividads,
  getActividadById,
  createActividad,
  updateActividad,
  deleteActividad,
} from '../repositories/actividadesRepository';
import { updateReunionesService } from './reunionesServices';
import { updateTicketsService } from './ticketsServices';

export const getActividadesService = async () => {
  const actividades = await getActividads();
  if (actividades.length === 0)
    throw new Error('No hay actividades para mostrar');
  return actividades;
};

export const getActividadesByIdService = async (id: string, rol: string) => {

  if (rol === 'admin') {
    const actividades = await getActividads();
    return actividades;
  }

  const actividades = await getActividadById(id);
  if (actividades.length === 0)
    throw new Error('No hay actividades para mostrar');
  return actividades;
};

export const createActividadesService = async (
  ActividadData: Partial<Actividad>,
) => {
  const actividadCreada = await createActividad(ActividadData);
  return actividadCreada;
};

export const updateActividadesService = async (
  id: string,
  ActividadData: Partial<Actividad>,
) => {
  if (ActividadData && ActividadData.tipo === ActividadesEnum.REUNION  && ActividadData.id_tipo_actividad) {
    // pass the reunion id string to the service
    await updateReunionesService(ActividadData.id_tipo_actividad, { descripcion: ActividadData.descripcion }, 'vendedor');
  }
  if(ActividadData && ActividadData.tipo === ActividadesEnum.TAREA && ActividadData.id_tipo_actividad){
   
    // Here you can add logic to update the related TAREA entity if needed
    await updateTicketsService(ActividadData.id_tipo_actividad, { descripcion: ActividadData.descripcion }, 'vendedor');
  }
  const actividadActualizada = await updateActividad(id, ActividadData);
  return actividadActualizada;
};

export const deleteActividadesService = async (id: string) => {
  const actividadBorrada = await deleteActividad(id);
  return actividadBorrada;
};
