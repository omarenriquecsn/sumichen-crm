import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migración "Vencimiento de lote":
 * - Agrega `lotes.fecha_vencimiento` (date, nullable). Se llena desde el Excel
 *   (columna VENCIMIENTO) o se edita manualmente por un admin.
 *
 * Idempotente (IF NOT EXISTS), igual que el resto de migraciones.
 *
 * NOTA: timestamp movido de 1787524220000 a 1787524223000 para evitar colisión
 * con `1787524220000-CampanasKeywordsSchema` (main).
 */
export class LoteVencimientoSchema1787524223000 implements MigrationInterface {
  name = 'LoteVencimientoSchema1787524223000';

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
