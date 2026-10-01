/**
 * Fusiona productos duplicados en el catalogo.
 *
 * Lee `mapeosDuplicados.json` (mapa `duplicado -> canonico`) y, para cada
 * fusion, reapunta TODAS las referencias del producto duplicado hacia el
 * canonico y luego elimina el producto duplicado:
 *   - `productos_pedido.producto_id`
 *   - `lotes.producto_id` (fusionando lotes con el mismo `almacen`+`codigo_lote`)
 *   - `movimientos_inventario.producto_id` / `lote_id`
 *   - `devoluciones_detalle.producto_id` / `lote_id`
 *
 * Uso (desde `backend/`):
 *   node build/scripts/fusionarDuplicados.js                 # dry-run (no cambia nada)
 *   node build/scripts/fusionarDuplicados.js --apply         # aplica los cambios
 *   node build/scripts/fusionarDuplicados.js --map ruta.json # usa otro mapa
 *
 * Es idempotente: si el duplicado ya no existe, lo reporta y continua.
 * En dry-run ejecuta todo dentro de una transaccion y hace rollback, para
 * validar que las fusiones no rompen ninguna restriccion.
 */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { AppDataSource } from '../config/dataBaseConfig';
import { recalcularDisponibilidadProductos } from '../services/inventarioServices';

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

interface Fusion {
  duplicado: string;
  canonico: string;
  nota?: string;
}

interface Mapeo {
  fusiones?: Fusion[];
}

const args = process.argv.slice(2);
const aplicar = args.includes('--apply');
const mapIdx = args.indexOf('--map');
const mapArg = mapIdx >= 0 ? args[mapIdx + 1] : null;

const candidatosMap = [
  mapArg,
  path.resolve(__dirname, 'mapeosDuplicados.json'),
  path.resolve(__dirname, '..', '..', 'mapeosDuplicados.json'),
  path.resolve(process.cwd(), 'mapeosDuplicados.json'),
].filter((p): p is string => Boolean(p));

const rutaMapa = candidatosMap.find((p) => fs.existsSync(p));
if (!rutaMapa) {
  console.error(
    'No se encontro mapeosDuplicados.json. Usa --map <ruta> o coloca el archivo en backend/.',
  );
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
  const normalizado = normalizarCodigo(v);
  const filas = await qr.query(
    `SELECT id, descripcion, nombre FROM productos
     WHERE regexp_replace(upper(descripcion), '\\s+', '', 'g') = $1`,
    [normalizado],
  );
  if (filas.length === 1) return filas[0];
  if (filas.length === 0) return null;
  throw new Error(
    `El codigo "${valor}" coincide con ${filas.length} productos; usa el UUID (id).`,
  );
};

interface ResumenFusion {
  duplicado: string;
  canonico: string;
  lineasPedido: number;
  movimientos: number;
  lotesFusionados: number;
  lotesReasignados: number;
  devoluciones: number;
}

const main = async (): Promise<void> => {
  const mapa = JSON.parse(fs.readFileSync(rutaMapa, 'utf8')) as Mapeo;
  const fusiones = (mapa.fusiones ?? []).filter(
    (f) => f.duplicado && f.canonico && f.duplicado.trim() !== f.canonico.trim(),
  );

  if (!fusiones.length) {
    console.log(`Mapa: ${rutaMapa}`);
    console.log(
      'No hay fusiones en mapeosDuplicados.json (llenalo con la reconciliacion de produccion).',
    );
    return;
  }

  console.log(`Mapa: ${rutaMapa}`);
  console.log(`Fusiones a procesar: ${fusiones.length}`);
  console.log(
    aplicar
      ? 'MODO APPLY: los cambios se confirmaran.'
      : 'MODO DRY-RUN: se valida todo y se hace rollback (no cambia nada).',
  );

  await AppDataSource.initialize();
  try {
    const qr = AppDataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    const resumen: ResumenFusion[] = [];

    try {
      for (const f of fusiones) {
        const dup = await resolverProducto(qr, f.duplicado);
        const canon = await resolverProducto(qr, f.canonico);

        if (!dup) {
          console.log(`  [OMITIDO] duplicado "${f.duplicado}" no existe (ya fusionado).`);
          continue;
        }
        if (!canon) {
          throw new Error(`No existe el canonico "${f.canonico}" (fusion ${f.duplicado}).`);
        }
        if (dup.id === canon.id) {
          console.log(`  [OMITIDO] "${f.duplicado}" y "${f.canonico}" son el mismo producto.`);
          continue;
        }

        const [lineas] = await qr.query(
          'SELECT count(*)::int AS c FROM productos_pedido WHERE producto_id = $1',
          [dup.id],
        );
        const [movs] = await qr.query(
          'SELECT count(*)::int AS c FROM movimientos_inventario WHERE producto_id = $1',
          [dup.id],
        );
        const [devs] = await qr.query(
          'SELECT count(*)::int AS c FROM devoluciones_detalle WHERE producto_id = $1',
          [dup.id],
        );

        const lotesDup: { id: string; almacen: string; codigo_lote: string; cantidad_inicial: string; cantidad_actual: string }[] =
          await qr.query(
            'SELECT id, almacen, codigo_lote, cantidad_inicial, cantidad_actual FROM lotes WHERE producto_id = $1',
            [dup.id],
          );

        let lotesFusionados = 0;
        let lotesReasignados = 0;
        for (const lote of lotesDup) {
          const existentes = await qr.query(
            `SELECT id, cantidad_inicial, cantidad_actual FROM lotes
             WHERE producto_id = $1 AND almacen = $2 AND codigo_lote = $3`,
            [canon.id, lote.almacen, lote.codigo_lote],
          );
          if (existentes.length) {
            const destino = existentes[0];
            await qr.query('UPDATE movimientos_inventario SET lote_id = $1 WHERE lote_id = $2', [
              destino.id,
              lote.id,
            ]);
            await qr.query('UPDATE devoluciones_detalle SET lote_id = $1 WHERE lote_id = $2', [
              destino.id,
              lote.id,
            ]);
            await qr.query(
              `UPDATE lotes
               SET cantidad_inicial = cantidad_inicial + $1,
                   cantidad_actual  = cantidad_actual  + $2
               WHERE id = $3`,
              [Number(lote.cantidad_inicial), Number(lote.cantidad_actual), destino.id],
            );
            await qr.query('DELETE FROM lotes WHERE id = $1', [lote.id]);
            lotesFusionados++;
          } else {
            await qr.query('UPDATE lotes SET producto_id = $1 WHERE id = $2', [
              canon.id,
              lote.id,
            ]);
            lotesReasignados++;
          }
        }

        await qr.query('UPDATE movimientos_inventario SET producto_id = $1 WHERE producto_id = $2', [
          canon.id,
          dup.id,
        ]);
        await qr.query('UPDATE devoluciones_detalle SET producto_id = $1 WHERE producto_id = $2', [
          canon.id,
          dup.id,
        ]);
        await qr.query('UPDATE productos_pedido SET producto_id = $1 WHERE producto_id = $2', [
          canon.id,
          dup.id,
        ]);
        await qr.query('DELETE FROM productos WHERE id = $1', [dup.id]);

        const item: ResumenFusion = {
          duplicado: `${dup.descripcion} (${dup.id})`,
          canonico: `${canon.descripcion} (${canon.id})`,
          lineasPedido: lineas.c,
          movimientos: movs.c,
          lotesFusionados,
          lotesReasignados,
          devoluciones: devs.c,
        };
        resumen.push(item);
        console.log(
          `  [OK] ${item.duplicado} -> ${item.canonico} | lineas:${item.lineasPedido} movs:${item.movimientos} devs:${item.devoluciones} lotes(fusion:${lotesFusionados} reasig:${lotesReasignados})`,
        );
      }

      if (aplicar) {
        await qr.commitTransaction();
      } else {
        await qr.rollbackTransaction();
      }
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }

    console.log(`Fusiones aplicadas: ${resumen.length}`);

    if (aplicar) {
      const disp = await recalcularDisponibilidadProductos();
      console.log(
        `Disponibilidad recalculada: ${disp.disponibles}/${disp.total} productos disponibles.`,
      );
      console.log('Fusion completada.');
    } else {
      console.log('DRY-RUN completado sin cambios. Repite con --apply para aplicar.');
    }
  } finally {
    await AppDataSource.destroy();
  }
};

main().catch((e) => {
  console.error('Error en la fusion:', e instanceof Error ? e.message : e);
  process.exit(1);
});
