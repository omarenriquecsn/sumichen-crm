/**
 * Reconcilia productos legacy: reubica stock mal asignado, fusiona registros
 * duplicados en su producto correcto y renombra al nombre del Excel.
 *
 * Lee `recodificaciones.json`:
 *   {
 *     "reubicaciones": [
 *       {
 *         "producto": "<uuid o codigo>",     // el registro a tratar
 *         "mover_lotes_a": "<uuid o codigo>", // opcional: mueve solo los lotes (stock)
 *         "fusionar_en": "<uuid o codigo>",   // opcional: fusiona el registro (pedidos+lotes) y lo elimina
 *         "nuevo_codigo": "MP10764X",         // opcional: renombra la descripcion (codigo)
 *         "nota": "..."
 *       }
 *     ],
 *     "renombrados": [
 *       { "producto": "<uuid o codigo>", "nuevo_nombre": "Nombre Excel", "nota": "..." }
 *     ]
 *   }
 *
 * Orden de ejecucion (dentro de una transaccion):
 *   1) mover_lotes_a  (reubica el stock al dueno real)
 *   2) nuevo_codigo   (recodifica el intruso)
 *   3) fusionar_en    (fusiona el registro en su producto correcto y lo elimina)
 *   4) renombrados    (renombra al nombre del Excel)
 *
 * Uso (desde `backend/`):
 *   node build/scripts/recodificarProductos.js          # dry-run
 *   node build/scripts/recodificarProductos.js --apply
 *   node build/scripts/recodificarProductos.js --map ruta.json
 */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { AppDataSource } from '../config/dataBaseConfig';
import { recalcularDisponibilidadProductos } from '../services/inventarioServices';

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

interface Reubicacion {
  producto: string;
  mover_lotes_a?: string;
  fusionar_en?: string;
  nuevo_codigo?: string;
  nota?: string;
}
interface Renombrado {
  producto: string;
  nuevo_nombre: string;
  nota?: string;
}
interface Mapeo {
  reubicaciones?: Reubicacion[];
  renombrados?: Renombrado[];
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

type ProductoFila = { id: string; descripcion: string; nombre: string };

const resolverProducto = async (
  qr: import('typeorm').QueryRunner,
  valor: string,
): Promise<ProductoFila | null> => {
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

/** Mueve lotes (y sus referencias de movimientos/devoluciones) + el producto_id de los movimientos. */
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
      `SELECT id FROM lotes WHERE producto_id = $1 AND almacen = $2 AND codigo_lote = $3`,
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

/** Fusiona el registro `desde` en `hasta` (mueve lotes, pedidos, movimientos, devoluciones) y lo elimina. */
const fusionarProducto = async (
  qr: import('typeorm').QueryRunner,
  desdeId: string,
  hastaId: string,
): Promise<{ lotes: number; pedidos: number }> => {
  const mov = await moverLotes(qr, desdeId, hastaId);
  const [ped] = await qr.query(
    'SELECT count(*)::int AS c FROM productos_pedido WHERE producto_id = $1',
    [desdeId],
  );
  await qr.query('UPDATE productos_pedido SET producto_id = $1 WHERE producto_id = $2', [hastaId, desdeId]);
  await qr.query('DELETE FROM productos WHERE id = $1', [desdeId]);
  return { lotes: mov.fusionados + mov.reasignados, pedidos: ped.c };
};

const main = async (): Promise<void> => {
  const mapa = JSON.parse(fs.readFileSync(rutaMapa, 'utf8')) as Mapeo;
  const reubicaciones = mapa.reubicaciones ?? [];
  const renombrados = mapa.renombrados ?? [];

  if (!reubicaciones.length && !renombrados.length) {
    console.log(`Mapa: ${rutaMapa}`);
    console.log('No hay reubicaciones ni renombrados.');
    return;
  }

  console.log(`Mapa: ${rutaMapa}`);
  console.log(aplicar ? 'MODO APPLY.' : 'MODO DRY-RUN: se valida todo y se hace rollback.');

  await AppDataSource.initialize();
  try {
    const qr = AppDataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      // 1) Mover stock al dueno real
      for (const r of reubicaciones) {
        if (!r.mover_lotes_a) continue;
        const producto = await resolverProducto(qr, r.producto);
        if (!producto) {
          console.log(`  [OMITIDO] producto "${r.producto}" no existe.`);
          continue;
        }
        const destino = await resolverProducto(qr, r.mover_lotes_a);
        if (!destino) throw new Error(`No existe el destino de lotes "${r.mover_lotes_a}".`);
        if (destino.id === producto.id) throw new Error(`Origen y destino de lotes iguales (${r.producto}).`);
        const mov = await moverLotes(qr, producto.id, destino.id);
        console.log(
          `  [STOCK] ${producto.descripcion} -> ${destino.descripcion}: fusionados:${mov.fusionados} reasig:${mov.reasignados} movs:${mov.movimientos}`,
        );
      }

      // 2) Recodificar intrusos
      for (const r of reubicaciones) {
        if (!r.nuevo_codigo) continue;
        const producto = await resolverProducto(qr, r.producto);
        if (!producto) {
          console.log(`  [OMITIDO] producto "${r.producto}" no existe.`);
          continue;
        }
        const nuevo = r.nuevo_codigo.trim();
        if (normalizarCodigo(nuevo) === normalizarCodigo(producto.descripcion)) continue;
        const colision = await qr.query(
          `SELECT id, descripcion FROM productos
           WHERE regexp_replace(upper(descripcion), '\\s+', '', 'g') = $1 AND id <> $2`,
          [normalizarCodigo(nuevo), producto.id],
        );
        if (colision.length) throw new Error(`El codigo "${nuevo}" ya existe (${colision[0].descripcion}).`);
        await qr.query('UPDATE productos SET descripcion = $1 WHERE id = $2', [nuevo, producto.id]);
        console.log(`  [CODIGO] ${producto.descripcion} -> "${nuevo}"`);
      }

      // 3) Fusionar registros legacy en su producto correcto
      for (const r of reubicaciones) {
        if (!r.fusionar_en) continue;
        const producto = await resolverProducto(qr, r.producto);
        if (!producto) {
          console.log(`  [OMITIDO] producto "${r.producto}" no existe (ya fusionado).`);
          continue;
        }
        const destino = await resolverProducto(qr, r.fusionar_en);
        if (!destino) throw new Error(`No existe el destino de fusion "${r.fusionar_en}".`);
        if (destino.id === producto.id) throw new Error(`Origen y destino de fusion iguales (${r.producto}).`);
        const res = await fusionarProducto(qr, producto.id, destino.id);
        console.log(`  [FUSION] ${producto.descripcion} -> ${destino.descripcion}: lotes:${res.lotes} pedidos:${res.pedidos}`);
      }

      // 4) Renombrar al nombre del Excel
      for (const r of renombrados) {
        const producto = await resolverProducto(qr, r.producto);
        if (!producto) {
          console.log(`  [OMITIDO] producto "${r.producto}" no existe.`);
          continue;
        }
        const nombre = r.nuevo_nombre.trim();
        if ((producto.nombre ?? '').trim() === nombre) continue;
        await qr.query('UPDATE productos SET nombre = $1 WHERE id = $2', [nombre, producto.id]);
        console.log(`  [NOMBRE] ${producto.descripcion}: "${producto.nombre}" -> "${nombre}"`);
      }

      if (aplicar) await qr.commitTransaction();
      else await qr.rollbackTransaction();
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }

    if (aplicar) {
      const disp = await recalcularDisponibilidadProductos();
      console.log(`Disponibilidad recalculada: ${disp.disponibles}/${disp.total}.`);
      console.log('Reconciliacion completada.');
    } else {
      console.log('DRY-RUN completado sin cambios. Repite con --apply.');
    }
  } finally {
    await AppDataSource.destroy();
  }
};

main().catch((e) => {
  console.error('Error en la reconciliacion:', e instanceof Error ? e.message : e);
  process.exit(1);
});
