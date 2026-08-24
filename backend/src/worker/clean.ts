import dotenv from 'dotenv';
dotenv.config();

import cron from 'node-cron';
import { deleteOldEvidencias } from '../config/supabaseConfig';

const schedule = process.env.CLEANUP_CRON || '0 3 * * *'; // 03:00 AM diario
const days = Number(process.env.CLEANUP_DAYS) || 60;

// Control para desactivar si se desea
if (process.env.RUN_CRON === 'false') {
  console.log('Cleanup worker disabled by RUN_CRON=false');
  process.exit(0);
}

console.log(`Scheduling cleanup worker: schedule="${schedule}" days=${days}`);

cron.schedule(schedule, async () => {
  console.log(new Date().toISOString(), 'Starting deleteOldEvidencias, days=', days);
  try {
    const res = await deleteOldEvidencias(days);
    console.log(new Date().toISOString(), 'Cleanup result:', res);
  } catch (err) {
    console.error(new Date().toISOString(), 'Cleanup error:', err);
  }
}, {
  timezone: process.env.CLEANUP_TZ || 'UTC'
});

// Keep process alive if PM2 / node executes the file (no extra code needed)