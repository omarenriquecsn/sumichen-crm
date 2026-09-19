import { AppDataSource } from '../config/dataBaseConfig';
import {
  getLeadsFinSemanaPausados,
  getLeadById,
  updateLead,
} from '../repositories/leadsRepository';
import { enviarMenuTipoContacto } from '../services/asistenteMenuServices';
import { esFinDeSemana, getPartesFechaLocal, getZonaHoraria } from '../utils/finSemana';

/**
 * Worker de reanudación del flujo de fin de semana.
 *
 * Los leads de WhatsApp sin vendedor que escribieron sábado/domingo quedan
 * pausados (`metadata.paso_menu = 'fin_semana'`) y reciben el mensaje de
 * horario de atención. Este worker, en día hábil a partir de
 * `FIN_SEMANA_REANUDAR_HORA` (default 8:00 en `WEEKEND_TZ`, default
 * `America/Caracas`), les reenvía el menú de bienvenida (tipo de contacto)
 * para que continúen el flujo de asignación por zona.
 *
 * Frecuencia: `FIN_SEMANA_CHECK_MIN` (default 15 min).
 */
export const iniciarFinSemana = async () => {
  const horaReanudar = parseInt(process.env.FIN_SEMANA_REANUDAR_HORA || '8', 10);
  const intervaloMin = parseInt(process.env.FIN_SEMANA_CHECK_MIN || '15', 10);

  console.log(
    `[FinSemana] Iniciado - zona ${getZonaHoraria()}, reanuda a las ${horaReanudar}:00, revisa cada ${intervaloMin} min`
  );

  const procesar = async () => {
    try {
      await AppDataSource.isInitialized;

      // Solo se reanuda en día hábil y a partir de la hora configurada.
      if (esFinDeSemana()) return;
      const { ymd, hora } = getPartesFechaLocal();
      if (hora < horaReanudar) return;

      const pausados = await getLeadsFinSemanaPausados();
      if (!pausados.length) return;

      console.log(`[FinSemana] Reanudando ${pausados.length} lead(s) pausado(s) (${ymd})`);

      for (const lead of pausados) {
        try {
          await enviarMenuTipoContacto(lead);

          // Marca de reanudación para trazabilidad. El cambio de `paso_menu`
          // (a 'tipo') ya evita procesar el mismo lead dos veces.
          const actual = await getLeadById(lead.id);
          if (actual) {
            await updateLead(actual.id, {
              metadata: { ...(actual.metadata || {}), fin_semana_reanudado: ymd },
            });
          }

          console.log(`[FinSemana] Lead ${lead.id} reanudado`);
        } catch (err) {
          console.error(
            `[FinSemana] Error reanudando lead ${lead.id}:`,
            err instanceof Error ? err.message : err
          );
        }
      }
    } catch (err) {
      console.error('[FinSemana] Error:', err instanceof Error ? err.message : err);
    }
  };

  const intervalo = setInterval(procesar, intervaloMin * 60 * 1000);
  await procesar(); // ejecución inicial

  return () => clearInterval(intervalo);
};
