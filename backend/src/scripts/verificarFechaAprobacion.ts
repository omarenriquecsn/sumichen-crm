/**
 * Verificación de integración: fecha de aprobación del pedido.
 *
 * Comprueba, contra la base de datos configurada en `backend/.env`:
 *  1. La migración creó `pedidos.fecha_aprobacion`.
 *  2. `updatePedidosService` sella `fecha_aprobacion` al aprobar (pendiente →
 *     procesado) y NO modifica `fecha_creacion`.
 *  3. Un pedido creado un mes anterior y aprobado ahora tiene su mes de venta
 *     en el mes actual (no en el de creación).
 *  4. Al revertir a `pendiente`, `fecha_aprobacion` se limpia.
 *
 * Es NO destructivo para datos existentes: inserta un pedido de prueba con
 * `notas = 'VERIF-FECHA-APROBACION'`, lo borra al terminar (try/finally) y no
 * toca ningún pedido real.
 *
 * Uso (desde `backend/`):
 *   node build/scripts/verificarFechaAprobacion.js          # solo chequeos de solo-lectura
 *   node build/scripts/verificarFechaAprobacion.js --apply  # incluye insertar/aprobar/revertir/borrar
 */
import path from 'path';
import dotenv from 'dotenv';
import { AppDataSource } from '../config/dataBaseConfig';
import { updatePedidosService } from '../services/pedidosServices';
import { Pedido } from '../entities/Pedidos';
import { EstadoPedidoEnum } from '../enums/EstadoPedidoEnum';

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const NOTAS = 'VERIF-FECHA-APROBACION';
const aplicar = process.argv.slice(2).includes('--apply');
let fallos = 0;
const ok = (cond: boolean, nombre: string, extra?: unknown) => {
  if (cond) console.log(`  \u2713 ${nombre}`);
  else {
    fallos++;
    console.error(`  \u2717 ${nombre}`, extra !== undefined ? extra : '');
  }
};

const main = async (): Promise<void> => {
  await AppDataSource.initialize();
  // Fecha de creación "de prueba": el 28 del mes PREVIO al actual (mes distinto
  // al de aprobación), en UTC, para que el caso sea significativo.
  const ahora = new Date();
  const fechaCreacionPrueba = new Date(
    Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth() - 1, 28, 12, 0, 0),
  );

  let pedidoId: string | null = null;
  try {
    console.log('\n== 1. Columna fecha_aprobacion ==');
    const col = await AppDataSource.query(
      `SELECT data_type FROM information_schema.columns
       WHERE table_name = 'pedidos' AND column_name = 'fecha_aprobacion'`,
    );
    ok(col.length === 1, `pedidos.fecha_aprobacion existe (tipo ${col[0]?.data_type})`);

    // Datos existentes: los históricos deben quedar NULL (sin backfill).
    const [{ nulos, conFecha }] = await AppDataSource.query(
      `SELECT count(*) FILTER (WHERE fecha_aprobacion IS NULL)::int AS nulos,
              count(*) FILTER (WHERE fecha_aprobacion IS NOT NULL)::int AS "conFecha"
       FROM pedidos`,
    );
    console.log(`  (detalle) históricos sin fecha_aprobacion: ${nulos}, con fecha: ${conFecha}`);

    if (!aplicar) {
      console.log(
        '\n(solo lectura) Pasa --apply para insertar/aprobar/revertir/borrar un pedido de prueba.',
      );
    } else {
    console.log('\n== 2. Aprobación sella fecha_aprobacion ==');
    const [cli] = await AppDataSource.query(
      `SELECT id FROM clientes LIMIT 1`,
    );
    const [ven] = await AppDataSource.query(
      `SELECT id FROM vendedores LIMIT 1`,
    );
    if (!cli || !ven) throw new Error('No hay clientes/vendedores para la prueba');

    const [ins] = await AppDataSource.query(
      `INSERT INTO pedidos
        (numero, cliente_id, vendedor_id, subtotal, impuestos, total, fecha_entrega,
         tipo_pago, dias_credito, moneda, transporte, fecha_creacion, estado, total_devuelto, notas)
       VALUES (nextval('numero_seq'), $1, $2, 1000, 0, 1000, now(),
         'contado', 0, 'usd', 'interno', $3, 'pendiente', 0, $4)
       RETURNING id`,
      [cli.id, ven.id, fechaCreacionPrueba.toISOString(), NOTAS],
    );
    pedidoId = ins.id;

    const antes = await AppDataSource.getRepository(Pedido).findOneBy({ id: pedidoId! });
    ok(antes?.estado === 'pendiente', 'pedido de prueba creado en pendiente');
    ok(
      antes?.fecha_aprobacion == null,
      'pedido pendiente no tiene fecha_aprobacion',
    );

    await updatePedidosService(pedidoId!, { estado: EstadoPedidoEnum.PROCESADO });

    const despues = await AppDataSource.getRepository(Pedido).findOneBy({ id: pedidoId! });
    ok(despues?.estado === 'procesado', 'updatePedidosService dejó el pedido procesado');
    ok(
      despues?.fecha_aprobacion != null,
      'updatePedidosService selló fecha_aprobacion',
    );

    const fa = despues?.fecha_aprobacion ? new Date(despues.fecha_aprobacion) : null;
    const dentroDeRango =
      fa != null && Math.abs(fa.getTime() - Date.now()) < 5 * 60 * 1000;
    ok(dentroDeRango, 'fecha_aprobacion ≈ ahora (sellada al aprobar)', fa);

    // fecha_creacion debe permanecer intacta (el mes previo).
    const fc = new Date(despues!.fecha_creacion);
    ok(
      fc.getUTCDate() === 28 && fc.getUTCMonth() === fechaCreacionPrueba.getUTCMonth(),
      'fecha_creacion NO se modificó al aprobar',
      fc.toISOString(),
    );

    console.log('\n== 3. Mes de venta = mes de aprobación (no el de creación) ==');
    ok(
      fa != null && fa.getUTCMonth() === ahora.getUTCMonth(),
      'mes de venta = mes actual (aprobación)',
    );
    ok(
      fc.getUTCMonth() !== ahora.getUTCMonth(),
      'mes de creación ≠ mes actual (no cuenta en el mes de creación)',
    );

    console.log('\n== 4. Revertir a pendiente limpia fecha_aprobacion ==');
    await updatePedidosService(pedidoId!, { estado: EstadoPedidoEnum.PENDIENTE });
    const revertido = await AppDataSource.getRepository(Pedido).findOneBy({ id: pedidoId! });
    ok(
      revertido?.fecha_aprobacion == null,
      'volver a pendiente limpia fecha_aprobacion',
    );
    }
  } finally {
    // Limpieza: borra SOLO el pedido de prueba (y sus movimientos/líneas si los hubiera).
    if (pedidoId) {
      await AppDataSource.query(
        `DELETE FROM movimientos_inventario WHERE pedido_id = $1`,
        [pedidoId],
      );
      await AppDataSource.query(`DELETE FROM productos_pedido WHERE pedido_id = $1`, [
        pedidoId,
      ]);
      const del = await AppDataSource.query(
        `DELETE FROM pedidos WHERE id = $1 AND notas = $2`,
        [pedidoId, NOTAS],
      );
      console.log(`\n(limpieza) pedido de prueba eliminado (${del[1] ?? 0} fila).`);
    }
    await AppDataSource.destroy();
  }

  console.log(
    `\n${fallos === 0 ? '\u2705 VERIFICACIÓN DE INTEGRACIÓN OK' : `\u274c ${fallos} FALLO(S)`}\n`,
  );
  process.exit(fallos === 0 ? 0 : 1);
};

main().catch((e) => {
  console.error('Error en la verificación:', e instanceof Error ? e.message : e);
  process.exit(1);
});
