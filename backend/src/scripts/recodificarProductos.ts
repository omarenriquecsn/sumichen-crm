/**
 * Recodifica productos y reubica lotes mal asignados.
 *
 * Caso de uso (categoria B de la reconciliacion): varios productos DISTINTOS
 * comparten el mismo codigo en `productos.descripcion`. El correcto es el que
 * describe el Excel; el intruso debe recibir un codigo nuevo. Ademas, por la
 * regla "first-wins" de la ingesta, el stock pudo quedar en el producto intruso
 * y hay que moverlo al producto correcto.
 *
 * Lee `recodificaciones.json`:
 *   {
 *     "recodificaciones": [
 *       {
 *         "producto": "<uuid o codigo actual del intruso>",
 *         "nuevo_codigo": "MP10750X",              // opcional: renombra descripcion
 *         "mover_lotes_a": "<uuid o codigo correcto>", // opcional: mueve lotes+refs
 *         "nota": "..."
 *       }
 *     ]
 *   }
 *
 * Uso (desde `backend/`):
 *   node build/scripts/recodificarProductos.js          # dry-run
 *   node build/scripts/recodificarProductos.js --apply
 *   node build/scripts/recodificarProductos.js --map ruta.json
 *
 * Idempotente: si el codigo nuevo ya no colisiona o el producto ya no existe,
 * lo reporta y continua. En dry-run valida todo y hace rollback.
 */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { AppDataSource } from '../config/dataBaseConfig';
import { recalcularDisponibilidadProductos } from '../services/inventarioServices';

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

interface Recodificacion {
  producto: string;
  nuevo_codigo?: string;
  mover_lotes_a?: string;
  nota?: string;
}
interface Mapeo {
  recodificaciones?: Recodificacion[];
}

const args = process.argv.slice(2);
const aplicar = args.includes('--apply');
const mapIdx = args.indexOf('--map');
const mapArg = mapIdx >= 0 ? args[mapIdx + 1] : null;

const candidatosMap = [
  mapArg,
  path.resolve(__dirname, 'recodificaciones.json'),
  path.resolve(__dirname, '..', '..', 'recodificaciones.json'),
  path.resolve(process.cwd(), 'recodificaciones.json'),
].filter((p): p is string => Boolean(p));

const rutaMapa = candidatosMap.find((p) => fs.existsSync(p));
if (!rutaMapa) {
  console.error('No se encontro recodificaciones.json. Usa --map <ruta>.');
  process.exit(1);
}

const esUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s.trim());

const normalizarCodigo = (s: string) => s.trim().toUpperCase().replace(/\s+/g, '');

const resolverProducto = async (
  qr: import('typeorm').QueryRunner,
  valor: string,
): Promise<{ id: string; descripcion: string; nombre: string } | null> => {
  const v = valor.trim();
  if (esUuid(v)) {
    const filas = await qr.query(
      'SELECT id, descripcion, nombre FROM productos WHERE id = $1',
      [v],
    );
    return filas[0] ?? null;
  }
  const filas = await qr.query(
    `SELECT id, descripcion, nombre FROM productos
     WHERE regexp_replace(upper(descripcion), '\\s+', '', 'g') = $1`,
    [normalizarCodigo(v)],
  );
  if (filas.length === 1) return filas[0];
  if (filas.length === 0) return null;
  throw new Error(`El codigo "${valor}" coincide con ${filas.length} productos; usa el UUID.`);
};

/** Mueve todos los lotes (y sus referencias) de `desde` hacia `hasta`. */
const moverLotes = async (
  qr: import('typeorm').QueryRunner,
  desdeId: string,
  hastaId: string,
): Promise<{ fusionados: number; reasignados: number; movimientos: number }> => {
  const lotes: { id: string; almacen: string; codigo_lote: string; cantidad_inicial: string; cantidad_actual: string }[] =
    await qr.query(
      'SELECT id, almacen, codigo_lote, cantidad_inicial, cantidad_actual FROM lotes WHERE producto_id = $1',
      [desdeId],
    );
  let fusionados = 0;
  let reasignados = 0;
  for (const lote of lotes) {
    const existentes = await qr.query(
      `SELECT id FROM lotes
       WHERE producto_id = $1 AND almacen = $2 AND codigo_lote = $3`,
      [hastaId, lote.almacen, lote.codigo_lote],
    );
    if (existentes.length) {
      const destino = existentes[0];
      await qr.query('UPDATE movimientos_inventario SET lote_id = $1 WHERE lote_id = $2', [destino.id, lote.id]);
      await qr.query('UPDATE devoluciones_detalle SET lote_id = $1 WHERE lote_id = $2', [destino.id, lote.id]);
      await qr.query(
        `UPDATE lotes SET cantidad_inicial = cantidad_inicial + $1, cantidad_actual = cantidad_actual + $2 WHERE id = $3`,
        [Number(lote.cantidad_inicial), Number(lote.cantidad_actual), destino.id],
      );
      await qr.query('DELETE FROM lotes WHERE id = $1', [lote.id]);
      fusionados++;
    } else {
      await qr.query('UPDATE lotes SET producto_id = $1 WHERE id = $2', [hastaId, lote.id]);
      reasignados++;
    }
  }
  const [movs] = await qr.query(
    'SELECT count(*)::int AS c FROM movimientos_inventario WHERE producto_id = $1',
    [desdeId],
  );
  await qr.query('UPDATE movimientos_inventario SET producto_id = $1 WHERE producto_id = $2', [hastaId, desdeId]);
  await qr.query('UPDATE devoluciones_detalle SET producto_id = $1 WHERE producto_id = $2', [hastaId, desdeId]);
  return { fusionados, reasignados, movimientos: movs.c };
};

const main = async (): Promise<void> => {
  const mapa = JSON.parse(fs.readFileSync(rutaMapa, 'utf8')) as Mapeo;
  const recod = (mapa.recodificaciones ?? []).filter((r) => r.producto && (r.nuevo_codigo || r.mover_lotes_a));

  if (!recod.length) {
    console.log(`Mapa: ${rutaMapa}`);
    console.log('No hay recodificaciones con nuevo_codigo o mover_lotes_a.');
    return;
  }

  console.log(`Mapa: ${rutaMapa}`);
  console.log(aplicar ? 'MODO APPLY.' : 'MODO DRY-RUN: se valida todo y se hace rollback.');

  await AppDataSource.initialize();
  try {
    const qr = AppDataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    let aplicadas = 0;
    try {
      for (const r of recod) {
        const producto = await resolverProducto(qr, r.producto);
        if (!producto) {
          console.log(`  [OMITIDO] producto "${r.producto}" no existe.`);
          continue;
        }

        const cambios: string[] = [];

        if (r.mover_lotes_a) {
          const destino = await resolverProducto(qr, r.mover_lotes_a);
          if (!destino) throw new Error(`No existe el destino "${r.mover_lotes_a}".`);
          if (destino.id === producto.id) throw new Error(`Origen y destino iguales (${r.producto}).`);
          const mov = await moverLotes(qr, producto.id, destino.id);
          cambios.push(`lotes->${destino.descripcion}(fusion:${mov.fusionados}, reasig:${mov.reasignados}, movs:${mov.movimientos})`);
        }

        if (r.nuevo_codigo) {
          const nuevo = r.nuevo_codigo.trim();
          if (!nuevo) throw new Error('nuevo_codigo vacio.');
          if (normalizarCodigo(nuevo) !== normalizarCodigo(producto.descripcion)) {
            const colision = await qr.query(
              `SELECT id, descripcion FROM productos
               WHERE regexp_replace(upper(descripcion), '\\s+', '', 'g') = $1 AND id <> $2`,
              [normalizarCodigo(nuevo), producto.id],
            );
            if (colision.length) {
              throw new Error(`El codigo "${nuevo}" ya existe (${colision[0].descripcion}).`);
            }
            await qr.query('UPDATE productos SET descripcion = $1 WHERE id = $2', [nuevo, producto.id]);
            cambios.push(`codigo "${producto.descripcion}"->"${nuevo}"`);
          }
        }

        console.log(`  [OK] ${producto.descripcion} (${producto.id}): ${cambios.join(' | ')}`);
        aplicadas++;
      }

      if (aplicar) await qr.commitTransaction();
      else await qr.rollbackTransaction();
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }

    console.log(`Recodificaciones aplicadas: ${aplicadas}`);
    if (aplicar) {
      const disp = await recalcularDisponibilidadProductos();
      console.log(`Disponibilidad recalculada: ${disp.disponibles}/${disp.total}.`);
    } else {
      console.log('DRY-RUN completado sin cambios. Repite con --apply.');
    }
  } finally {
    await AppDataSource.destroy();
  }
};

main().catch((e) => {
  console.error('Error en la recodificacion:', e instanceof Error ? e.message : e);
  process.exit(1);
});
