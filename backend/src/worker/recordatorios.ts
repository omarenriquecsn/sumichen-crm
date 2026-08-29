import { AppDataSource } from '../config/dataBaseConfig';
import { Actividad } from '../entities/Actividades';
import { ActividadesEnum } from '../enums/ActividadesEnum';
import { enviarPushAUsuario } from '../services/pushServices';
import { EventoNotificacionEnum } from '../enums/EventoNotificacionEnum';

/**
 * Worker de recordatorios de actividades próximas (PWA Web Push).
 *
 * Cada N minutos busca actividades (llamada / email / reunión) NO completadas
 * cuya fecha caiga dentro de la ventana de aviso (`RECORDATORIO_MINUTOS`, por
 * defecto 60 = 1 hora) y que aún no hayan sido avisadas, envía la notificación
 * push al vendedor dueño y marca `recordatorio_enviado` para no repetir.
 *
 * Nota: las reuniones crean automáticamente una `Actividad` de tipo 'reunion'
 * (id_tipo_actividad), así que cubrir `actividades` es suficiente.
 */
export const iniciarRecordatorios = async () => {
  const minutos = parseInt(process.env.RECORDATORIO_MINUTOS || '60', 10);
  const intervaloMin = parseInt(process.env.RECORDATORIO_INTERVALO_MIN || '5', 10);
  console.log(`[Recordatorios] Iniciado - revisando cada ${intervaloMin} min, aviso ${minutos} min antes`);

  const procesar = async () => {
    try {
      await AppDataSource.isInitialized;
      const repo = AppDataSource.getRepository(Actividad);
      const ahora = new Date();
      const limite = new Date(ahora.getTime() + minutos * 60 * 1000);

      const actividades = await repo
        .createQueryBuilder('a')
        .leftJoinAndSelect('a.cliente', 'cliente')
        .leftJoinAndSelect('a.vendedor', 'vendedor')
        .where('a.completado = false')
        .andWhere('a.recordatorio_enviado = false')
        .andWhere('a.tipo IN (:...tipos)', {
          tipos: [ActividadesEnum.LLAMADA, ActividadesEnum.EMAIL, ActividadesEnum.REUNION],
        })
        .andWhere('a.fecha >= :ahora', { ahora })
        .andWhere('a.fecha <= :limite', { limite })
        .getMany();

      for (const actividad of actividades) {
        const tipoLabel =
          actividad.tipo === ActividadesEnum.REUNION ? 'Reunión' :
          actividad.tipo === ActividadesEnum.LLAMADA ? 'Llamada' : 'Correo';
        const fechaTxt = new Date(actividad.fecha).toLocaleString('es-VE', {
          dateStyle: 'short',
          timeStyle: 'short',
        });
        const empresa = actividad.cliente?.empresa || actividad.cliente?.nombre || 'cliente';

        const enviadas = await enviarPushAUsuario(
          actividad.vendedor_id,
          {
            titulo: `📅 ${tipoLabel} próxima: ${actividad.titulo}`,
            cuerpo: `${empresa} · ${fechaTxt}`,
            url: '#/reuniones',
          },
          EventoNotificacionEnum.ACTIVIDAD_PROXIMA,
        );

        await repo.update(actividad.id, {
          recordatorio_enviado: true,
          recordatorio_enviado_en: new Date(),
        });

        if (enviadas > 0) {
          console.log(
            `[Recordatorios] ${new Date().toISOString()} - Aviso "${actividad.titulo}" (${actividad.id}) a vendedor ${actividad.vendedor_id}`
          );
        }
      }
    } catch (err) {
      console.error('[Recordatorios] Error:', err instanceof Error ? err.message : err);
    }
  };

  const intervalo = setInterval(procesar, intervaloMin * 60 * 1000);
  await procesar(); // ejecución inicial

  return () => clearInterval(intervalo);
};
