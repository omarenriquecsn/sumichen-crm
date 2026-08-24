import { AppDataSource } from '../config/dataBaseConfig';
import { procesarSLAVencidos } from '../services/leadsServices';

export const iniciarSLA = async () => {
  const horasSLA = parseInt(process.env.SLA_HOURS || '12', 10);
  console.log(`[SLA Monitor] Iniciado - verificando cada 15 min, SLA: ${horasSLA}h`);

  const intervalo = setInterval(async () => {
    try {
      await AppDataSource.isInitialized;
      const resultado = await procesarSLAVencidos(horasSLA);
      if (resultado.length > 0) {
        console.log(`[SLA Monitor] ${new Date().toISOString()} - Procesados ${resultado.length} leads:`);
        resultado.forEach((r) => console.log(`  - Lead ${r.leadId}: ${r.accion}`, r.nuevoVendedorId ? `→ ${r.nuevoVendedorId}` : ''));
      }
    } catch (err) {
      console.error('[SLA Monitor] Error:', err instanceof Error ? err.message : err);
    }
  }, 15 * 60 * 1000); // Cada 15 minutos

  // Ejecutar una vez al inicio
  try {
    const resultado = await procesarSLAVencidos(horasSLA);
    if (resultado.length > 0) {
      console.log(`[SLA Monitor] Ejecución inicial: ${resultado.length} leads procesados`);
    }
  } catch (err) {
    console.error('[SLA Monitor] Error en ejecución inicial:', err instanceof Error ? err.message : err);
  }

  return () => clearInterval(intervalo);
};