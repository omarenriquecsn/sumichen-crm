import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migración "Fecha de aprobación del pedido":
 * - Agrega `pedidos.fecha_aprobacion` (timestamptz, nullable), la fecha en que
 *   el pedido pasó a estado `procesado` (aprobado).
 * - A partir de este cambio los cálculos de ventas por mes usan
 *   `fecha_aprobacion ?? fecha_creacion` (fallback para los pedidos históricos,
 *   que quedan en NULL a propósito: no se puede recuperar cuándo se aprobaron).
 *
 * Idempotente (IF NOT EXISTS), igual que el resto de migraciones del proyecto.
 */
export class FechaAprobacionPedidoSchema1787524228000
  implements MigrationInterface
{
  name = 'FechaAprobacionPedidoSchema1787524228000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "pedidos"
      ADD COLUMN IF NOT EXISTS "fecha_aprobacion" timestamptz;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "pedidos" DROP COLUMN IF EXISTS "fecha_aprobacion";
    `);
  }
}
