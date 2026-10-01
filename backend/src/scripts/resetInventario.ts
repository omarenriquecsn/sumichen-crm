/**
 * Reset de inventario (UNA sola vez, destructivo).
 *
 * Borra TODOS los lotes y movimientos de inventario para dejar el sistema
 * limpio antes de cargar el Excel nuevo. NO toca `productos` (catálogo) ni
 * `pedidos`/`productos_pedido` (historial de ventas).
 *
 * Uso (desde `backend/`):
 *   node build/scripts/resetInventario.js            # dry-run (no borra nada)
 *   node build/scripts/resetInventario.js --apply    # ejecuta el borrado
 *   node build/scripts/resetInventario.js --apply --forzar  # ignora la guarda
 *
 * Guarda: aborta si hay movimientos con `pedido_id` (historial real de ventas)
 * salvo que se pase --forzar.
 */
import path from 'path';
import dotenv from 'dotenv';
import { AppDataSource } from '../config/dataBaseConfig';
import { recalcularDisponibilidadProductos } from '../services/inventarioServices';

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const args = process.argv.slice(2);
const aplicar = args.includes('--apply');
const forzar = args.includes('--forzar');

const main = async (): Promise<void> => {
  await AppDataSource.initialize();
  try {
    const qr = AppDataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      const [{ lotes }] = await qr.query('SELECT count(*)::int AS lotes FROM lotes');
      const [{ movimientos }] = await qr.query(
        'SELECT count(*)::int AS movimientos FROM movimientos_inventario',
      );
      const [{ conPedido }] = await qr.query(
        'SELECT count(*)::int AS "conPedido" FROM movimientos_inventario WHERE pedido_id IS NOT NULL',
      );

      console.log(`Lotes: ${lotes}`);
      console.log(`Movimientos de inventario: ${movimientos}`);
      console.log(`Movimientos ligados a pedidos: ${conPedido}`);

      if (conPedido > 0 && !forzar) {
        throw new Error(
          `Hay ${conPedido} movimiento(s) ligados a pedidos. Revisa antes de borrar (usa --forzar si estas seguro).`,
        );
      }

      if (!aplicar) {
        console.log('MODO DRY-RUN: no se borra nada. Repite con --apply.');
        await qr.rollbackTransaction();
      } else {
        await qr.query('DELETE FROM movimientos_inventario');
        await qr.query('DELETE FROM lotes');
        await qr.commitTransaction();
        console.log('Reset aplicado: lotes y movimientos eliminados.');
      }
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }

    if (aplicar) {
      const disp = await recalcularDisponibilidadProductos();
      console.log(
        `Disponibilidad recalculada: ${disp.disponibles}/${disp.total} productos disponibles.`,
      );
      console.log('Listo para cargar el Excel nuevo.');
    }
  } finally {
    await AppDataSource.destroy();
  }
};

main().catch((e) => {
  console.error('Error en el reset:', e instanceof Error ? e.message : e);
  process.exit(1);
});
