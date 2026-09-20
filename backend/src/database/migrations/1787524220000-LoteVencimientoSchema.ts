import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migración "Vencimiento de lote":
 * - Agrega `lotes.fecha_vencimiento` (date, nullable). Se llena desde el Excel
 *   (columna VENCIMIENTO) o se edita manualmente por un admin.
 *
 * Idempotente (IF NOT EXISTS), igual que el resto de migraciones.
 */
export class LoteVencimientoSchema1787524220000 implements MigrationInterface {
  name = 'LoteVencimientoSchema1787524220000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "lotes"
        ADD COLUMN IF NOT EXISTS "fecha_vencimiento" date;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "lotes" DROP COLUMN IF EXISTS "fecha_vencimiento";
    `);
  }
}
