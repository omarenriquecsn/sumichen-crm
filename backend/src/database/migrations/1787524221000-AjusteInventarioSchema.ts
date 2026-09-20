import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migración "Ajustes de inventario":
 * - Crea el enum `motivo_ajuste_enum`.
 * - Agrega `ajuste_positivo` / `ajuste_negativo` a `movimiento_inventario_tipo_enum`.
 * - Agrega `movimientos_inventario.motivo_categoria`.
 *
 * Idempotente (IF NOT EXISTS / DO $$ ADD VALUE).
 */
export class AjusteInventarioSchema1787524221000 implements MigrationInterface {
  name = 'AjusteInventarioSchema1787524221000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'motivo_ajuste_enum') THEN
          CREATE TYPE motivo_ajuste_enum AS ENUM
            ('conteo_fisico', 'merma', 'dano', 'vencimiento', 'correccion', 'otro');
        END IF;
      END $$;
    `);

    for (const valor of ['ajuste_positivo', 'ajuste_negativo']) {
      await queryRunner.query(`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_enum e
            JOIN pg_type t ON e.enumtypid = t.oid
            WHERE t.typname = 'movimiento_inventario_tipo_enum' AND e.enumlabel = '${valor}'
          ) THEN
            ALTER TYPE movimiento_inventario_tipo_enum ADD VALUE '${valor}';
          END IF;
        END $$;
      `);
    }

    await queryRunner.query(`
      ALTER TABLE "movimientos_inventario"
        ADD COLUMN IF NOT EXISTS "motivo_categoria" motivo_ajuste_enum;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "movimientos_inventario" DROP COLUMN IF EXISTS "motivo_categoria";
    `);
    // No se eliminan valores de enum (no aporta en dev).
  }
}
