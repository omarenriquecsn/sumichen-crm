/**
 * Restaura un respaldo generado por `services/backupServices.ts`.
 *
 * Uso (desde `backend/`):
 *   node build/scripts/restoreBackup.js --list
 *   node build/scripts/restoreBackup.js                 # último dump diario
 *   node build/scripts/restoreBackup.js 2026-09-18      # fecha concreta
 *   node build/scripts/restoreBackup.js 2026-09-18 --yes
 *   node build/scripts/restoreBackup.js --yes --no-evidencias
 *
 * ⚠ DESTRUCTIVO: `pg_restore --clean` borra y recrea los objetos de la base de
 * datos. Sin `--yes` no ejecuta nada (solo muestra lo que haría).
 *
 * Restaura la DB desde `BACKUP_BUCKET/db/...` y, salvo `--no-evidencias`, baja
 * el espejo `BACKUP_BUCKET/evidencias/` a `EVIDENCIA_UPLOAD_PATH`.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import dotenv from 'dotenv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const args = process.argv.slice(2);
const listar = args.includes('--list');
const confirmar = args.includes('--yes');
const sinEvidencias = args.includes('--no-evidencias');
const fecha = args.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a)) || null;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const BUCKET = process.env.BACKUP_BUCKET || 'backups';
const DATABASE_URL = process.env.DATABASE_URL;

interface ItemBucket {
  name: string;
  id: string | null;
  metadata?: { size?: number } | null;
}

const listarPrefijo = async (
  supabase: SupabaseClient,
  prefix: string,
): Promise<ItemBucket[]> => {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(prefix, { limit: 1000, sortBy: { column: 'name', order: 'asc' } as never });
  if (error) throw new Error(`list(${prefix}): ${error.message}`);
  return (data ?? []) as unknown as ItemBucket[];
};

const descargar = async (
  supabase: SupabaseClient,
  remotePath: string,
  destPath: string,
): Promise<number> => {
  const { data, error } = await supabase.storage.from(BUCKET).download(remotePath);
  if (error) throw new Error(`download(${remotePath}): ${error.message}`);
  const buf = Buffer.from(await data.arrayBuffer());
  fs.writeFileSync(destPath, buf);
  return buf.length;
};

const restaurarEvidencias = async (supabase: SupabaseClient): Promise<number> => {
  const destino =
    process.env.EVIDENCIA_UPLOAD_PATH ||
    path.resolve(__dirname, '..', '..', 'uploads', 'evidencias');
  fs.mkdirSync(destino, { recursive: true });
  let total = 0;
  const walk = async (prefix: string): Promise<void> => {
    for (const item of await listarPrefijo(supabase, prefix)) {
      const full = `${prefix}/${item.name}`;
      if (item.id === null || item.id === undefined) {
        await walk(full);
      } else {
        const rel = full.slice('evidencias/'.length);
        await descargar(supabase, full, path.join(destino, rel));
        total++;
      }
    }
  };
  await walk('evidencias');
  console.log(`✅ Evidencias restauradas: ${total} archivo(s) en ${destino}`);
  return total;
};

const main = async (): Promise<void> => {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Falta SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (backend/.env)');
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const items = await listarPrefijo(supabase, 'db');
  const diarios = items
    .map((i) => i.name)
    .filter((n) => /^sumichem-\d{4}-\d{2}-\d{2}\.dump$/.test(n))
    .sort();
  const semanales = items
    .map((i) => i.name)
    .filter((n) => /^sumichem-weekly-\d{4}-W\d{2}\.dump$/.test(n))
    .sort();

  if (listar) {
    console.log(`Bucket: ${BUCKET}`);
    console.log('Dumps diarios disponibles:');
    diarios.forEach((n) => console.log('  -', n));
    console.log('Dumps semanales disponibles:');
    semanales.forEach((n) => console.log('  -', n));
    if (!diarios.length && !semanales.length) console.log('  (ninguno)');
    return;
  }

  if (!diarios.length) throw new Error(`No hay dumps diarios en ${BUCKET}/db`);
  const elegido = fecha ? `sumichem-${fecha}.dump` : diarios[diarios.length - 1];
  if (!diarios.includes(elegido)) {
    throw new Error(`No existe el dump "${elegido}". Usa --list para ver los disponibles.`);
  }
  if (!DATABASE_URL) throw new Error('Falta DATABASE_URL (backend/.env)');

  console.log(`Dump elegido: ${BUCKET}/db/${elegido}`);
  if (!confirmar) {
    console.error(
      '⚠ Restore DESTRUCTIVO (pg_restore --clean). Repite con --yes para confirmar.',
    );
    process.exit(2);
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sumichem-restore-'));
  const tmpDump = path.join(tmpDir, elegido);
  try {
    const bytes = await descargar(supabase, `db/${elegido}`, tmpDump);
    console.log(`Descargado (${bytes} bytes). Restaurando en la base de datos...`);
    execFileSync(
      'pg_restore',
      ['--clean', '--if-exists', '--no-owner', '-d', DATABASE_URL, tmpDump],
      { stdio: 'inherit' },
    );
    console.log('✅ Base de datos restaurada.');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  if (!sinEvidencias) {
    await restaurarEvidencias(supabase);
  }

  console.log('Restore completado. Reinicia el backend: pm2 restart crm-server');
};

main().catch((e) => {
  console.error('Error en el restore:', e instanceof Error ? e.message : e);
  process.exit(1);
});
