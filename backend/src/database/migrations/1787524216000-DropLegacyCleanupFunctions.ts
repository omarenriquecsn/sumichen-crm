import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Elimina las funciones de limpieza de la versión antigua que quedaron en la DB
 * (venían del dump legacy y ya no se usan: el mantenimiento ahora lo hace el
 * worker `worker/limpiezaDb.ts`).
 *
 * Idempotente (`IF EXISTS`), no-op en una DB nueva.
 */
export class DropLegacyCleanupFunctions1787524216000 implements MigrationInterface {
  name = 'DropLegacyCleanupFunctions1787524216000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const funciones = [
      'eliminar_actividades_antiguas',
      'eliminar_metas_antiguas',
      'eliminar_oportunidades_antiguas',
      'eliminar_pedidos_antiguos',
      'eliminar_reuniones_antiguas',
      'eliminar_tickets_antiguos',
      'resetear_monto_negociacion',
    ];

    for (const fn of funciones) {
      await queryRunner.query(`DROP FUNCTION IF EXISTS ${fn}() CASCADE;`);
    }
  }

  public async down(): Promise<void> {
    // No se recrean: eran legacy y ya no se usan.
  }
}
