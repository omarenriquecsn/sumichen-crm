import { Notificacion } from '../entities/Notificaciones';
import { AppDataSource } from '../config/dataBaseConfig';
const NotificacionRepository = AppDataSource.getRepository(Notificacion);
export const crearNotificacionRepository = async (notificacion: Partial<Notificacion>) => {
  return await NotificacionRepository.save(notificacion);
};
export const obtenerNotificacionesPorUsuario = async (usuarioId: string) => {
  return await NotificacionRepository.find({
    where: { vendedor_id: usuarioId },
    order: { fecha: 'DESC' },
  });
};
export const marcarNotificacionComoLeida = async (id: string) => {
  await NotificacionRepository.update(id, { leida: true });
};
export const eliminarNotificacion = async (id: string) => {
  await NotificacionRepository.delete({ vendedor_id: id });
};