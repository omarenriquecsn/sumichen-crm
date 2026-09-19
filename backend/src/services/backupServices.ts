import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../config/supabaseConfig';
import { getEvidenciasDir } from '../utils/limpiezaArchivos';
import { enviarCorreoMantenimiento } from './correosServices';

/**
 * Servicio de respaldo diario del CRM.
 *
 *  1. DB: `pg_dump -Fc` → bucket Supabase `backups/db/`. Retención configurable
 *     (por defecto 7 diarios + 4 semanales, los domingos se guarda además una
 *     copia semanal). El dump se adjunta por correo a `BACKUP_TO`/`MAINTENANCE_EMAIL`.
 *  2. Evidencias: espejo incremental de `EVIDENCIA_UPLOAD_PATH` →
 *     `backups/evidencias/`. Sube solo archivos nuevos/cambiados y elimina los
 *     remotos que ya no existen en local (con guarda si el local queda vacío).
 *
 * Todo es tolerante a fallos: cada sección se intenta y se registra; un error no
 * aborta las demás. Se ejecuta desde `worker/clean.ts` (cron diario).
 */

const num = (v: string | undefined, def: number): number => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : def;
};

interface ResumenBackup {
  db?: { archivo: string; bytes: number; subido: boolean; correo: string };
  semanal?: { archivo: string; subido: boolean };
  retencion?: { diariosBorrados: number; semanalesBorrados: number };
  evidencias?: { subidas: number; borradas: number; omitidoBorrado: boolean };
  errores: string[];
}

const fechaIso = (d = new Date()): string => d.toISOString().slice(0, 10);

/** Año/semana ISO (para nombrar la copia semanal). */
const isoSemana = (d: Date): { year: number; week: number } => {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: date.getUTCFullYear(), week };
};

/** Asegura que el bucket exista (lo crea privado si falta). */
const asegurarBucket = async (supabase: SupabaseClient, bucket: string): Promise<void> => {
  const { error } = await supabase.storage.getBucket(bucket);
  if (!error) return;
  const { error: createErr } = await supabase.storage.createBucket(bucket, { public: false });
  if (createErr && !/already exists|duplicate/i.test(createErr.message)) {
    throw new Error(`No se pudo crear el bucket "${bucket}": ${createErr.message}`);
  }
};

/** Lista plana de archivos dentro de un prefijo del bucket (no recursivo). */
const listarPrefijo = async (
  supabase: SupabaseClient,
  bucket: string,
  prefix: string,
): Promise<{ name: string; size: number }[]> => {
  const out: { name: string; size: number }[] = [];
  const limit = 1000;
  let offset = 0;
  while (true) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, { limit, offset, sortBy: { column: 'name', order: 'asc' } as never });
    if (error) throw new Error(`list(${prefix || '/'}): ${error.message}`);
    if (!data || data.length === 0) break;
    for (const item of data as Array<{ name: string; metadata?: { size?: number } }>) {
      out.push({ name: item.name, size: item.metadata?.size ?? 0 });
    }
    if (data.length < limit) break;
    offset += data.length;
  }
  return out;
};

/** Lista recursiva del contenido de un prefijo del bucket. */
const listarRemotoRecursivo = async (
  supabase: SupabaseClient,
  bucket: string,
  prefix: string,
): Promise<Map<string, number>> => {
  const out = new Map<string, number>();
  const walk = async (p: string) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(p, { limit: 1000, sortBy: { column: 'name', order: 'asc' } as never });
    if (error) throw new Error(`list(${p || '/'}): ${error.message}`);
    for (const item of (data ?? []) as Array<{
      name: string;
      id: string | null;
      metadata?: { size?: number };
    }>) {
      const full = p ? `${p}/${item.name}` : item.name;
      if (item.id === null || item.id === undefined) {
        await walk(full);
      } else {
        out.set(full, item.metadata?.size ?? 0);
      }
    }
  };
  await walk(prefix);
  return out;
};

/** Lista recursiva de archivos locales. */
const listarLocalRecursivo = (
  dir: string,
  prefix = '',
): { relPath: string; absPath: string; size: number }[] => {
  const out: { relPath: string; absPath: string; size: number }[] = [];
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const abs = path.join(dir, name);
    let st: fs.Stats;
    try {
      st = fs.statSync(abs);
    } catch {
      continue;
    }
    const rel = prefix ? `${prefix}/${name}` : name;
    if (st.isDirectory()) out.push(...listarLocalRecursivo(abs, rel));
    else if (st.isFile()) out.push({ relPath: rel, absPath: abs, size: st.size });
  }
  return out;
};

/** Borra en el bucket, en lotes de 100. */
const borrarRemotos = async (
  supabase: SupabaseClient,
  bucket: string,
  paths: string[],
): Promise<number> => {
  let borrados = 0;
  for (let i = 0; i < paths.length; i += 100) {
    const chunk = paths.slice(i, i + 100);
    const { error } = await supabase.storage.from(bucket).remove(chunk);
    if (error) throw new Error(`remove: ${error.message}`);
    borrados += chunk.length;
  }
  return borrados;
};

/** Genera el pg_dump en un temporal y devuelve su ruta + tamaño. */
const generarDump = (): { tmpPath: string; bytes: number } => {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL no está configurada');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sumichem-backup-'));
  const tmpPath = path.join(dir, `sumichem-${fechaIso()}.dump`);
  execFileSync('pg_dump', [url, '-Fc', '-f', tmpPath], { stdio: 'inherit' });
  const bytes = fs.statSync(tmpPath).size;
  return { tmpPath, bytes };
};

/** Aplica retención a `backups/db/` (N diarios + M semanales más recientes). */
const aplicarRetencionDb = async (
  supabase: SupabaseClient,
  bucket: string,
  keepDaily: number,
  keepWeekly: number,
): Promise<{ diariosBorrados: number; semanalesBorrados: number }> => {
  const archivos = await listarPrefijo(supabase, bucket, 'db');
  const nombres = archivos.map((a) => a.name);

  const diarios = nombres
    .filter((n) => /^sumichem-\d{4}-\d{2}-\d{2}\.dump$/.test(n))
    .sort()
    .reverse();
  const semanales = nombres
    .filter((n) => /^sumichem-weekly-\d{4}-\d{2}\.dump$/.test(n))
    .sort()
    .reverse();

  const aBorrar = [
    ...diarios.slice(keepDaily),
    ...semanales.slice(keepWeekly),
  ].map((n) => `db/${n}`);

  let borrados = 0;
  if (aBorrar.length) borrados = await borrarRemotos(supabase, bucket, aBorrar);

  return {
    diariosBorrados: diarios.length > keepDaily ? diarios.length - keepDaily : 0,
    semanalesBorrados: semanales.length > keepWeekly ? semanales.length - keepWeekly : 0,
  };
};

/** Espejo incremental del folder de evidencias. */
const espejarEvidencias = async (
  supabase: SupabaseClient,
  bucket: string,
): Promise<{ subidas: number; borradas: number; omitidoBorrado: boolean }> => {
  const localDir = getEvidenciasDir();
  const locales = listarLocalRecursivo(localDir);
  const remotos = await listarRemotoRecursivo(supabase, bucket, 'evidencias');

  let subidas = 0;
  const localesSet = new Set<string>();
  for (const f of locales) {
    const remotePath = `evidencias/${f.relPath}`;
    localesSet.add(remotePath);
    const sizeRemoto = remotos.get(remotePath);
    if (sizeRemoto !== undefined && sizeRemoto === f.size) continue; // sin cambios
    const buffer = fs.readFileSync(f.absPath);
    const { error } = await supabase.storage
      .from(bucket)
      .upload(remotePath, buffer, { upsert: true, contentType: 'application/octet-stream' });
    if (error) throw new Error(`upload(${remotePath}): ${error.message}`);
    subidas++;
  }

  const aBorrar = [...remotos.keys()].filter((p) => !localesSet.has(p));

  // Guarda: si el local quedó vacío pero hay remotos, algo va mal (montaje/disco):
  // no borrar el backup.
  if (locales.length === 0 && remotos.size > 0) {
    return { subidas, borradas: 0, omitidoBorrado: true };
  }

  const borradas = aBorrar.length ? await borrarRemotos(supabase, bucket, aBorrar) : 0;
  return { subidas, borradas, omitidoBorrado: false };
};

export const ejecutarBackup = async (): Promise<ResumenBackup> => {
  const resumen: ResumenBackup = { errores: [] };

  if (process.env.BACKUP_ENABLED === 'false') {
    console.log('Backup deshabilitado por BACKUP_ENABLED=false');
    return resumen;
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn('Backup: Supabase no configurado (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY). Se omite.');
    return resumen;
  }

  const bucket = process.env.BACKUP_BUCKET || 'backups';
  const keepDaily = num(process.env.BACKUP_DB_RETENTION_DAILY, 7);
  const keepWeekly = num(process.env.BACKUP_DB_RETENTION_WEEKLY, 4);
  const hacerEvidencias = process.env.BACKUP_EVIDENCIAS !== 'false';
  const ahora = new Date();

  console.log(new Date().toISOString(), `Backup: inicio (bucket=${bucket})`);

  try {
    await asegurarBucket(supabase, bucket);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    resumen.errores.push(msg);
    console.error('Backup: no se pudo preparar el bucket:', msg);
    return resumen;
  }

  // --- DB ---
  let tmpPath: string | null = null;
  try {
    const dump = generarDump();
    tmpPath = dump.tmpPath;
    const buffer = fs.readFileSync(dump.tmpPath);
    const nombre = `sumichem-${fechaIso(ahora)}.dump`;
    const remotePath = `db/${nombre}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(remotePath, buffer, { upsert: true, contentType: 'application/octet-stream' });
    if (error) throw new Error(`upload(${remotePath}): ${error.message}`);

    resumen.db = { archivo: remotePath, bytes: dump.bytes, subido: true, correo: '' };
    console.log(new Date().toISOString(), `Backup DB subido: ${remotePath} (${dump.bytes} bytes)`);

    // Copia semanal los domingos.
    if (ahora.getUTCDay() === 0) {
      const { year, week } = isoSemana(ahora);
      const nombreSemanal = `sumichem-weekly-${year}-W${String(week).padStart(2, '0')}.dump`;
      const remoteSemanal = `db/${nombreSemanal}`;
      const { error: errSem } = await supabase.storage
        .from(bucket)
        .upload(remoteSemanal, buffer, { upsert: true, contentType: 'application/octet-stream' });
      if (errSem) throw new Error(`upload(${remoteSemanal}): ${errSem.message}`);
      resumen.semanal = { archivo: remoteSemanal, subido: true };
      console.log(new Date().toISOString(), `Backup semanal subido: ${remoteSemanal}`);
    }

    // Correo con el dump adjunto.
    const to = process.env.BACKUP_TO || process.env.MAINTENANCE_EMAIL;
    if (to && process.env.RESEND_API_KEY) {
      try {
        await enviarCorreoMantenimiento({
          to,
          asunto: `[Sumichem CRM] Backup DB ${fechaIso(ahora)}`,
          cuerpoHtml: `
            <h2 style="margin:0 0 8px;">Backup diario de la base de datos</h2>
            <p style="color:#6b7280;margin:0 0 12px;">${new Date().toISOString()}</p>
            <p>Se adjunta el respaldo <code>${nombre}</code> (${(dump.bytes / 1024).toFixed(0)} KB).</p>
            <p>También quedó en Supabase Storage: <code>${bucket}/${remotePath}</code>.</p>
          `,
          adjuntos: [
            {
              filename: nombre,
              buffer,
              mimetype: 'application/octet-stream',
            },
          ],
        });
        resumen.db.correo = to;
        console.log(new Date().toISOString(), `Backup DB enviado por correo a ${to}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        resumen.errores.push(`correo: ${msg}`);
        console.error('Backup: no se pudo enviar el correo:', msg);
      }
    } else {
      console.warn('Backup: correo omitido (falta BACKUP_TO/MAINTENANCE_EMAIL o RESEND_API_KEY)');
    }

    // Retención.
    try {
      resumen.retencion = await aplicarRetencionDb(supabase, bucket, keepDaily, keepWeekly);
      console.log(
        new Date().toISOString(),
        `Backup retención: diariosBorrados=${resumen.retencion.diariosBorrados} semanalesBorrados=${resumen.retencion.semanalesBorrados}`,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      resumen.errores.push(`retencion: ${msg}`);
      console.error('Backup: error aplicando retención:', msg);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    resumen.errores.push(`db: ${msg}`);
    console.error('Backup DB error:', msg);
  } finally {
    if (tmpPath) {
      try {
        fs.rmSync(path.dirname(tmpPath), { recursive: true, force: true });
      } catch {
        // temporal: no crítico
      }
    }
  }

  // --- Evidencias ---
  if (hacerEvidencias) {
    try {
      resumen.evidencias = await espejarEvidencias(supabase, bucket);
      console.log(
        new Date().toISOString(),
        `Backup evidencias: subidas=${resumen.evidencias.subidas} borradas=${resumen.evidencias.borradas} omitidoBorrado=${resumen.evidencias.omitidoBorrado}`,
      );
      if (resumen.evidencias.omitidoBorrado) {
        console.warn(
          'Backup: folder de evidencias local vacío con remotos existentes; se omitió el borrado por seguridad.',
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      resumen.errores.push(`evidencias: ${msg}`);
      console.error('Backup evidencias error:', msg);
    }
  }

  console.log(new Date().toISOString(), 'Backup: fin', JSON.stringify(resumen));
  return resumen;
};
