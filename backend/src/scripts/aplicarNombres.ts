/**
 * Aplica nombres definitivos a productos EXCEPCIONALES (los que la carga del
 * inventario no pudo renombrar por tener codigo duplicado o estar en revision).
 *
 * Lee `nombresExcepciones.json` con la forma:
 *   { "nombres": { "ME10103": "Nombre definitivo", "<uuid>": "Otro nombre" } }
 *
 * Uso (desde `backend/`):
 *   node build/scripts/aplicarNombres.js                 # dry-run
 *   node build/scripts/aplicarNombres.js --apply
 *   node build/scripts/aplicarNombres.js --map ruta.json
 */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { AppDataSource } from '../config/dataBaseConfig';

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

interface Mapeo {
  nombres?: Record<string, string>;
}

const args = process.argv.slice(2);
const aplicar = args.includes('--apply');
const mapIdx = args.indexOf('--map');
const mapArg = mapIdx >= 0 ? args[mapIdx + 1] : null;

const candidatosMap = [
  mapArg,
  path.resolve(__dirname, 'nombresExcepciones.json'),
  path.resolve(__dirname, '..', '..', 'nombresExcepciones.json'),
  path.resolve(process.cwd(), 'nombresExcepciones.json'),
].filter((p): p is string => Boolean(p));

const rutaMapa = candidatosMap.find((p) => fs.existsSync(p));
if (!rutaMapa) {
  console.error(
    'No se encontro nombresExcepciones.json. Usa --map <ruta> o coloca el archivo en backend/.',
  );
  process.exit(1);
}

const esUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s.trim());

const main = async (): Promise<void> => {
  const mapa = JSON.parse(fs.readFileSync(rutaMapa, 'utf8')) as Mapeo;
  const entradas = Object.entries(mapa.nombres ?? {}).filter(
    ([, nombre]) => typeof nombre === 'string' && nombre.trim(),
  );

  if (!entradas.length) {
    console.log(`Mapa: ${rutaMapa}`);
    console.log('No hay nombres para aplicar (llenalo con las excepciones "revisar").');
    return;
  }

  console.log(`Mapa: ${rutaMapa}`);
  console.log(
    aplicar ? 'MODO APPLY.' : 'MODO DRY-RUN: no se guarda nada.',
  );

  await AppDataSource.initialize();
  try {
    const qr = AppDataSource.createQueryRunner();
    await qr.connect();
    let actualizados = 0;
    let omitidos = 0;

    for (const [clave, nombre] of entradas) {
      const v = clave.trim();
      let filas: { id: string; descripcion: string; nombre: string }[] = [];
      if (esUuid(v)) {
        filas = await qr.query(
          'SELECT id, descripcion, nombre FROM productos WHERE id = $1',
          [v],
        );
      } else {
        filas = await qr.query(
          `SELECT id, descripcion, nombre FROM productos
           WHERE regexp_replace(upper(descripcion), '\\s+', '', 'g') = $1`,
          [v.toUpperCase().replace(/\s+/g, '')],
        );
      }

      if (filas.length !== 1) {
        console.log(
          `  [OMITIDO] "${clave}": ${filas.length} coincidencias (usa un codigo unico o el UUID).`,
        );
        omitidos++;
        continue;
      }
      const p = filas[0];
      if ((p.nombre ?? '').trim() === nombre.trim()) {
        console.log(`  [SIN CAMBIO] ${p.descripcion}: ya tiene ese nombre.`);
        continue;
      }
      console.log(`  [${aplicar ? 'OK' : 'DRY'}] ${p.descripcion}: "${p.nombre}" -> "${nombre}"`);
      if (aplicar) {
        await qr.query('UPDATE productos SET nombre = $1 WHERE id = $2', [nombre.trim(), p.id]);
      }
      actualizados++;
    }

    await qr.release();
    console.log(
      `Nombres ${aplicar ? 'actualizados' : 'a actualizar'}: ${actualizados} | omitidos: ${omitidos}`,
    );
    if (!aplicar) console.log('DRY-RUN completado. Repite con --apply para aplicar.');
  } finally {
    await AppDataSource.destroy();
  }
};

main().catch((e) => {
  console.error('Error al aplicar nombres:', e instanceof Error ? e.message : e);
  process.exit(1);
});
