import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import zlib from 'zlib';
import { execFileSync } from 'child_process';
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

import cron from 'node-cron';
import { DataSource } from 'typeorm';
import {
  borrarArchivosPorNombre,
  getEvidenciasDir,
} from '../utils/limpiezaArchivos';
import { filasACsv } from '../utils/csv';
import {
  enviarCorreoMantenimiento,
  type AdjuntoCorreo,
} from '../services/correosServices';

/**
 * Worker de limpieza de la base de datos.
 *
 * Borra información antigua para mantener la DB y el disco bajo control:
 *  - pedidos `procesado` viejos (+ productos_pedido, evidencias PDF y transporte huérfano)
 *  - reuniones completadas y tickets cerrados viejos (+ su Actividad vinculada)
 *  - oportunidades cerradas, leads perdidos/convertidos viejos
 *  - notificaciones leídas, actividades completadas y mensajes de chats cerrados
 *
 * Antes de borrar hace un `pg_dump` de respaldo y envía por correo un reporte con
 * un CSV (comprimido) de las filas eliminadas.
 *
 * Modo prueba: `DB_CLEANUP_DRY_RUN=true` (default) solo cuenta y envía el reporte.
 * Ejecución manual: `node build/worker/limpiezaDb.js --once`.
 */

interface Paso {
  nombre: string;
  select: string;
  deletes: string[];
  params: unknown[];
  evidencias?: boolean;
}

interface ResumenBackup {
  file: string;
  size: number;
}

const num = (v: string | undefined, def: number): number => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : def;
};

const construirPasos = (): Paso[] => {
  const pedidos = num(process.env.DB_CLEANUP_PEDIDOS_DIAS, 180);
  const reuniones = num(process.env.DB_CLEANUP_REUNIONES_DIAS, 365);
  const tickets = num(process.env.DB_CLEANUP_TICKETS_DIAS, 365);
  const oportunidades = num(process.env.DB_CLEANUP_OPORTUNIDADES_DIAS, 365);
  const leads = num(process.env.DB_CLEANUP_LEADS_DIAS, 365);
  const notificaciones = num(process.env.DB_CLEANUP_NOTIFICACIONES_DIAS, 90);
  const actividades = num(process.env.DB_CLEANUP_ACTIVIDADES_DIAS, 365);
  const mensajes = num(process.env.DB_CLEANUP_MENSAJES_DIAS, 180);

  const p = (d: number) => [String(d)];

  return [
    {
      nombre: 'pedidos',
      select: `SELECT * FROM pedidos WHERE estado = 'procesado' AND fecha_creacion < now() - ($1 || ' days')::interval`,
      deletes: [
        `DELETE FROM productos_pedido WHERE pedido_id IN (SELECT id FROM pedidos WHERE estado = 'procesado' AND fecha_creacion < now() - ($1 || ' days')::interval)`,
        `DELETE FROM pedidos WHERE estado = 'procesado' AND fecha_creacion < now() - ($1 || ' days')::interval`,
      ],
      params: p(pedidos),
      evidencias: true,
    },
    {
      nombre: 'transporte_huerfano',
      select: `SELECT * FROM transporte WHERE id NOT IN (SELECT transporte_id FROM pedidos WHERE transporte_id IS NOT NULL)`,
      deletes: [
        `DELETE FROM transporte WHERE id NOT IN (SELECT transporte_id FROM pedidos WHERE transporte_id IS NOT NULL)`,
      ],
      params: [],
    },
    {
      nombre: 'reuniones',
      select: `SELECT * FROM reuniones WHERE estado = 'completada' AND fecha_inicio < now() - ($1 || ' days')::interval`,
      deletes: [
        `DELETE FROM actividades WHERE tipo = 'reunion' AND id_tipo_actividad IN (SELECT id::text FROM reuniones WHERE estado = 'completada' AND fecha_inicio < now() - ($1 || ' days')::interval)`,
        `DELETE FROM reuniones WHERE estado = 'completada' AND fecha_inicio < now() - ($1 || ' days')::interval`,
      ],
      params: p(reuniones),
    },
    {
      nombre: 'tickets',
      select: `SELECT * FROM tickets WHERE estado IN ('resuelto','cerrado') AND fecha_creacion < now() - ($1 || ' days')::interval`,
      deletes: [
        `DELETE FROM actividades WHERE tipo = 'tarea' AND id_tipo_actividad IN (SELECT id::text FROM tickets WHERE estado IN ('resuelto','cerrado') AND fecha_creacion < now() - ($1 || ' days')::interval)`,
        `DELETE FROM tickets WHERE estado IN ('resuelto','cerrado') AND fecha_creacion < now() - ($1 || ' days')::interval`,
      ],
      params: p(tickets),
    },
    {
      nombre: 'oportunidades',
      select: `SELECT * FROM oportunidades WHERE etapa = 'cerrado' AND fecha_creacion < now() - ($1 || ' days')::interval`,
      deletes: [
        `DELETE FROM oportunidades WHERE etapa = 'cerrado' AND fecha_creacion < now() - ($1 || ' days')::interval`,
      ],
      params: p(oportunidades),
    },
    {
      nombre: 'leads',
      select: `SELECT * FROM leads WHERE estado IN ('perdido','convertido') AND fecha_creacion < now() - ($1 || ' days')::interval`,
      deletes: [
        `DELETE FROM leads WHERE estado IN ('perdido','convertido') AND fecha_creacion < now() - ($1 || ' days')::interval`,
      ],
      params: p(leads),
    },
    {
      nombre: 'notificaciones',
      select: `SELECT * FROM notificaciones WHERE leida = true AND fecha < now() - ($1 || ' days')::interval`,
      deletes: [
        `DELETE FROM notificaciones WHERE leida = true AND fecha < now() - ($1 || ' days')::interval`,
      ],
      params: p(notificaciones),
    },
    {
      nombre: 'actividades',
      select: `SELECT * FROM actividades WHERE completado = true AND fecha < now() - ($1 || ' days')::interval`,
      deletes: [
        `DELETE FROM actividades WHERE completado = true AND fecha < now() - ($1 || ' days')::interval`,
      ],
      params: p(actividades),
    },
    {
      nombre: 'mensajes',
      select: `SELECT * FROM mensajes WHERE fecha_creacion < now() - ($1 || ' days')::interval AND conversacion_id IN (SELECT id FROM conversaciones WHERE estado = 'cerrada')`,
      deletes: [
        `DELETE FROM mensajes WHERE fecha_creacion < now() - ($1 || ' days')::interval AND conversacion_id IN (SELECT id FROM conversaciones WHERE estado = 'cerrada')`,
      ],
      params: p(mensajes),
    },
  ];
};

const nombreDesdeUrl = (url: unknown): string | null => {
  if (!url || typeof url !== 'string') return null;
  try {
    return path.basename(new URL(url).pathname);
  } catch {
    return path.basename(url);
  }
};

const formatearBytes = (b: number): string => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
};

const htmlReporte = (
  filas: { nombre: string; count: number }[],
  extra: { modo: string; backup?: ResumenBackup | null; evidencias?: number; notaAdjunto?: string },
): string => {
  const total = filas.reduce((a, f) => a + f.count, 0);
  const rows = filas
    .map(
      (f) =>
        `<tr><td style="padding:6px 10px;border-bottom:1px solid #eee;">${f.nombre}</td><td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;">${f.count}</td></tr>`,
    )
    .join('');
  return `
    <h2 style="margin:0 0 8px;">Mantenimiento de limpieza — ${extra.modo}</h2>
    <p style="color:#6b7280;margin:0 0 16px;">${new Date().toISOString()}</p>
    <table style="border-collapse:collapse;width:100%;font-family:Arial,Helvetica,sans-serif;font-size:14px;">
      <thead><tr><th style="text-align:left;padding:6px 10px;border-bottom:2px solid #ddd;">Tabla</th><th style="text-align:right;padding:6px 10px;border-bottom:2px solid #ddd;">Filas</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><th style="text-align:left;padding:6px 10px;">TOTAL</th><th style="text-align:right;padding:6px 10px;">${total}</th></tr></tfoot>
    </table>
    ${extra.evidencias !== undefined ? `<p style="margin-top:12px;">Evidencias PDF borradas: <b>${extra.evidencias}</b></p>` : ''}
    ${extra.backup ? `<p style="margin-top:12px;">Respaldo: <code>${extra.backup.file}</code> (${formatearBytes(extra.backup.size)})</p>` : ''}
    ${extra.notaAdjunto ? `<p style="margin-top:12px;color:#b45309;">${extra.notaAdjunto}</p>` : ''}
  `;
};

async function main() {
  if (process.env.DB_CLEANUP_ENABLED === 'false') {
    console.log('Limpieza DB deshabilitada por DB_CLEANUP_ENABLED=false');
    return;
  }

  // DataSource "crudo" (sin entidades ni migraciones) solo para SQL directo.
  const ds = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [],
    migrations: [],
    synchronize: false,
    logging: false,
  });
  await ds.initialize();

  const dryRun = process.env.DB_CLEANUP_DRY_RUN !== 'false';
  const pasos = construirPasos();

  const enviarReporte = async (
    filas: { nombre: string; count: number }[],
    extra: {
      modo: string;
      backup?: ResumenBackup | null;
      evidencias?: number;
      csvGz?: Buffer;
    },
  ) => {
    const enabled = process.env.MAINTENANCE_EMAIL_ENABLED !== 'false';
    const to = process.env.MAINTENANCE_EMAIL;
    if (!enabled || !to) {
      console.log('Correo de mantenimiento deshabilitado o sin MAINTENANCE_EMAIL');
      return;
    }
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY no configurada: no se envía correo de mantenimiento');
      return;
    }

    const adjuntos: AdjuntoCorreo[] = [];
    let notaAdjunto = '';
    if (extra.csvGz && extra.csvGz.length > 0) {
      const maxMb = num(process.env.DB_CLEANUP_EMAIL_MAX_MB, 10);
      if (extra.csvGz.length <= maxMb * 1024 * 1024) {
        const fecha = new Date().toISOString().slice(0, 10);
        adjuntos.push({
          filename: `filas-eliminadas-${fecha}.csv.gz`,
          buffer: extra.csvGz,
          mimetype: 'application/gzip',
        });
      } else {
        notaAdjunto = `El CSV de filas eliminadas supera ${maxMb} MB y no se adjuntó.`;
      }
    }

    try {
      await enviarCorreoMantenimiento({
        to,
        asunto: `[Sumichem CRM] Limpieza ${extra.modo} — ${new Date().toISOString().slice(0, 10)}`,
        cuerpoHtml: htmlReporte(filas, { ...extra, notaAdjunto }),
        adjuntos,
      });
      console.log('Correo de mantenimiento enviado a', to);
    } catch (e) {
      console.error('No se pudo enviar el correo de mantenimiento:', e instanceof Error ? e.message : e);
    }
  };

  const contar = async (paso: Paso): Promise<number> => {
    const res = (await ds.query(
      `SELECT count(*)::int AS n FROM (${paso.select}) t`,
      paso.params,
    )) as { n: number }[];
    return res[0]?.n ?? 0;
  };

  const seleccionar = async (paso: Paso): Promise<Record<string, unknown>[]> => {
    return (await ds.query(paso.select, paso.params)) as Record<string, unknown>[];
  };

  const borrar = async (paso: Paso) => {
    for (const sql of paso.deletes) {
      await ds.query(sql, paso.params);
    }
  };

  try {
    // ===== Dry-run: solo contar y avisar =====
    if (dryRun) {
      const filas: { nombre: string; count: number }[] = [];
      for (const paso of pasos) filas.push({ nombre: paso.nombre, count: await contar(paso) });
      console.log('DRY-RUN:', JSON.stringify(filas));
      await enviarReporte(filas, { modo: 'dry-run' });
      return;
    }

    // ===== Real: seleccionar (para CSV), respaldar, borrar =====
    const filasPorPaso = new Map<string, Record<string, unknown>[]>();
    const resumen: { nombre: string; count: number }[] = [];
    for (const paso of pasos) {
      const rows = await seleccionar(paso);
      filasPorPaso.set(paso.nombre, rows);
      resumen.push({ nombre: paso.nombre, count: rows.length });
    }

    const total = resumen.reduce((a, r) => a + r.count, 0);
    if (total === 0) {
      console.log('Nada para limpiar.');
      return;
    }

    // Respaldo previo (obligatorio salvo DB_CLEANUP_BACKUP=false)
    let backup: ResumenBackup | null = null;
    if (process.env.DB_CLEANUP_BACKUP !== 'false') {
      const dir = process.env.DB_CLEANUP_BACKUP_DIR || path.resolve(__dirname, '..', '..', 'backups');
      fs.mkdirSync(dir, { recursive: true });
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const file = path.join(dir, `pre-limpieza-${ts}.dump`);
      try {
        execFileSync('pg_dump', [String(process.env.DATABASE_URL), '-Fc', '-f', file], {
          stdio: 'inherit',
        });
      } catch (e) {
        throw new Error(
          `Respaldo pg_dump falló; se ABORTA la limpieza para no borrar sin respaldo: ${
            e instanceof Error ? e.message : String(e)
          }`,
        );
      }
      backup = { file, size: fs.statSync(file).size };

      const ret = num(process.env.DB_CLEANUP_BACKUP_RETENTION, 5);
      const archivos = fs
        .readdirSync(dir)
        .filter((n) => n.startsWith('pre-limpieza-') && n.endsWith('.dump'))
        .sort();
      while (archivos.length > ret) {
        const viejo = archivos.shift();
        if (viejo) fs.unlinkSync(path.join(dir, viejo));
      }
    }

    // Borrado
    for (const paso of pasos) {
      await borrar(paso);
      console.log(`Borrado: ${paso.nombre} (${filasPorPaso.get(paso.nombre)?.length ?? 0})`);
    }

    // Evidencias de los pedidos borrados: el PDF fusionado legacy
    // (`pedidos.evidencia_url`) + los archivos originales de `pedido_evidencias`.
    const pedidosRows = filasPorPaso.get('pedidos') || [];
    const nombresEvidencias = pedidosRows
      .map((r) => nombreDesdeUrl(r.evidencia_url))
      .filter((n): n is string => Boolean(n));

    const pedidoIds = pedidosRows
      .map((r) => r.id)
      .filter((v): v is string => typeof v === 'string' && v.length > 0);
    if (pedidoIds.length) {
      try {
        const evRows = (await ds.query(
          `SELECT archivo_nombre FROM pedido_evidencias WHERE pedido_id = ANY($1::uuid[])`,
          [pedidoIds],
        )) as { archivo_nombre: string }[];
        for (const r of evRows) {
          const n = nombreDesdeUrl(r.archivo_nombre) ?? r.archivo_nombre;
          if (n) nombresEvidencias.push(path.basename(n));
        }
      } catch (e) {
        console.warn(
          'No se pudieron listar las evidencias múltiples:',
          e instanceof Error ? e.message : e,
        );
      }
    }

    const evRes = borrarArchivosPorNombre(getEvidenciasDir(), nombresEvidencias);

    // CSV comprimido con las filas eliminadas
    const secciones: string[] = [];
    for (const [nombre, rows] of filasPorPaso.entries()) {
      if (!rows.length) continue;
      secciones.push(`### tabla: ${nombre}\n${filasACsv(rows)}\n`);
    }
    const csvGz = secciones.length
      ? zlib.gzipSync(Buffer.from(secciones.join('\n'), 'utf-8'))
      : undefined;

    // Mantenimiento de tablas
    await ds.query('VACUUM (ANALYZE)');

    await enviarReporte(resumen, {
      modo: 'real',
      backup,
      evidencias: evRes.deleted,
      csvGz,
    });

    console.log('Limpieza completada. Evidencias borradas:', evRes.deleted);
  } finally {
    await ds.destroy();
  }
}

// ===== Arranque =====
if (process.argv.includes('--once')) {
  main()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error('Limpieza DB error:', e instanceof Error ? e.message : e);
      process.exit(1);
    });
} else {
  const schedule = process.env.DB_CLEANUP_CRON || '0 4 * * *';
  console.log(`Scheduling limpieza DB: schedule="${schedule}"`);
  cron.schedule(
    schedule,
    () => {
      main().catch((e) => console.error('Limpieza DB error:', e instanceof Error ? e.message : e));
    },
    { timezone: process.env.DB_CLEANUP_TZ || 'UTC' },
  );
}
