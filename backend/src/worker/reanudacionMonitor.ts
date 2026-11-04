import { AppDataSource } from '../config/dataBaseConfig';
import { getLeadsRetenidos } from '../repositories/leadsRepository';
import { enviarMenuTipoContacto } from '../services/asistenteMenuServices';
import { asignarLeadRetenido } from '../services/leadsRetenidosServices';
import { getPartesFechaLocal, getZonaHoraria } from '../utils/finSemana';
import {
  esDiaHabilAhora,
  getHorarioFin,
  getHorarioInicio,
} from '../utils/horarioLaboral';

/**
 * Worker de reanudación de leads retenidos fuera de horario.
 *
 * Los leads de WhatsApp sin vendedor que escribieron de noche, en fin de
 * semana o en un feriado quedan con `metadata.paso_menu = 'fuera_horario'`
 * (ya con la zona o el tipo de contacto guardado). En el próximo día hábil,
 * a partir de `HORARIO_INICIO` (default 8:00), este worker los asigna:
 *   - cliente → vendedor con menor carga de su zona
 *   - proveedor/trabajo → usuario configurado
 * y abre la conversación + push al vendedor.
 *
 * También cubre los leads legado de fin de semana (`paso_menu='fin_semana'`):
 * a esos se les reenvía el menú de tipo de contacto para que respondan el
 * estado y sigan el flujo normal.
 *
 * Frecuencia: `REANUDACION_CHECK_MIN` (default 15 min).
 */
export const iniciarReanudacion = async () => {
  const horaInicio = getHorarioInicio();
  const horaFin = getHorarioFin();
  const intervaloMin = parseInt(
    process.env.REANUDACION_CHECK_MIN ||
      process.env.FIN_SEMANA_CHECK_MIN ||
      '15',
    10,
  );

  console.log(
    `[Reanudacion] Iniciado - zona ${getZonaHoraria()}, asigna entre ${horaInicio}:00 y ${horaFin}:00, revisa cada ${intervaloMin} min`,
  );

  const procesar = async () => {
    try {
      await AppDataSource.isInitialized;

      // Solo se reanuda en día hábil y dentro del horario laboral.
      if (!(await esDiaHabilAhora())) return;
      const { ymd, hora } = getPartesFechaLocal();
      if (hora < horaInicio || hora >= horaFin) return;

      const retenidos = await getLeadsRetenidos();
      if (!retenidos.length) return;

      console.log(`[Reanudacion] Procesando ${retenidos.length} lead(s) retenido(s) (${ymd})`);

      for (const lead of retenidos) {
        try {
          const paso = lead.metadata?.paso_menu;

          if (paso === 'fin_semana') {
            // Legado: no tiene zona guardada; se reinicia el menú.
            await enviarMenuTipoContacto(lead);
            console.log(`[Reanudacion] Lead ${lead.id} legado reenviado al menú`);
            continue;
          }

          const asignado = await asignarLeadRetenido(lead.id);
          console.log(
            asignado
              ? `[Reanudacion] Lead ${lead.id} asignado a ${asignado.vendedor_asignado_id}`
              : `[Reanudacion] Lead ${lead.id} no se pudo asignar (se reintentará)`,
          );
        } catch (err) {
          console.error(
            `[Reanudacion] Error procesando lead ${lead.id}:`,
            err instanceof Error ? err.message : err,
          );
        }
      }
    } catch (err) {
      console.error('[Reanudacion] Error:', err instanceof Error ? err.message : err);
    }
  };

  const intervalo = setInterval(procesar, intervaloMin * 60 * 1000);
  await procesar(); // ejecución inicial

  return () => clearInterval(intervalo);
};
