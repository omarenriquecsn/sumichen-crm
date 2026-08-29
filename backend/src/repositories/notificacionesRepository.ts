import { Notificacion } from '../entities/Notificaciones';
import { AppDataSource } from '../config/dataBaseConfig';
const NotificacionRepository = AppDataSource.getRepository(Notificacion);
export const crearNotificacionRepository = async (notificacion: Partial<Notificacion>) => {
  return await NotificacionRepository.save(notificacion);
};
const DIAS_RETENCION = 15;

export const obtenerNotificacionesPorUsuario = async (usuarioId: string) => {
  await NotificacionRepository.createQueryBuilder()
    .delete()
    .where('vendedor_id = :usuarioId', { usuarioId })
    .andWhere('fecha < NOW() - (:dias || \' days\')::interval', { dias: DIAS_RETENCION })
    .execute();
  return await NotificacionRepository.find({
    where: { vendedor_id: usuarioId },
    order: { fecha: 'DESC' },
    take: 5,
  });
};
export const marcarNotificacionComoLeida = async (id: string) => {
  await NotificacionRepository.update(id, { leida: true });
};
export const marcarTodasComoLeidas = async (usuarioId: string) => {
  await NotificacionRepository.update({ vendedor_id: usuarioId }, { leida: true });
};
export const eliminarNotificacion = async (id: string) => {
  await NotificacionRepository.delete({ vendedor_id: id });
};