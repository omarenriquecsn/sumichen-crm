import dotenv from 'dotenv';
dotenv.config();

import cron from 'node-cron';
import { deleteOldEvidencias } from '../config/supabaseConfig';
import { borrarArchivosAntiguos, getExportsDir } from '../utils/limpiezaArchivos';
import { ejecutarBackup } from '../services/backupServices';

const schedule = process.env.CLEANUP_CRON || '0 3 * * *'; // 03:00 AM diario
const days = Number(process.env.CLEANUP_DAYS) || 60;
const exportsDays = Number(process.env.EXPORTS_CLEANUP_DAYS) || 30;

// Control para desactivar si se desea
if (process.env.RUN_CRON === 'false') {
  console.log('Cleanup worker disabled by RUN_CRON=false');
  process.exit(0);
}

// --- Backup diario (DB + evidencias a Supabase) ---
// Ejecución manual de prueba: `node build/worker/clean.js --backup-once`
const backupSchedule = process.env.BACKUP_CRON || '30 3 * * *';
const backupOnce = process.argv.includes('--backup-once');
if (backupOnce) {
  ejecutarBackup()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error('Backup error:', e instanceof Error ? e.message : e);
      process.exit(1);
    });
} else {
  console.log(`Scheduling backup worker: schedule="${backupSchedule}"`);
  cron.schedule(
    backupSchedule,
    () => {
      ejecutarBackup().catch((e) =>
        console.error('Backup error:', e instanceof Error ? e.message : e),
      );
    },
    { timezone: process.env.BACKUP_TZ || 'UTC' },
  );

  console.log(
    `Scheduling cleanup worker: schedule="${schedule}" supabaseDays=${days} exportsDays=${exportsDays}`,
  );

  cron.schedule(
    schedule,
    async () => {
      console.log(new Date().toISOString(), 'Starting cleanup (Supabase + exports)');
      try {
        const supabaseRes = await deleteOldEvidencias(days);
        console.log(new Date().toISOString(), 'Supabase cleanup:', supabaseRes);
      } catch (err) {
        console.error(new Date().toISOString(), 'Supabase cleanup error:', err);
      }

      try {
        const exportsRes = borrarArchivosAntiguos(getExportsDir(), exportsDays);
        console.log(new Date().toISOString(), 'Exports cleanup:', exportsRes);
      } catch (err) {
        console.error(new Date().toISOString(), 'Exports cleanup error:', err);
      }
    },
    {
      timezone: process.env.CLEANUP_TZ || 'UTC',
    },
  );
}

// Nota: la limpieza de evidencias PDF en disco se hace en `worker/limpiezaDb.ts`,
// ligada al borrado de su pedido (no por antigüedad), para no romper links de
// pedidos que aún existen.
