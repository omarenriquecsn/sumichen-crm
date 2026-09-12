import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migración "Actividad de envío de WhatsApp":
 *
 * 1. Agrega el valor 'whatsapp' al enum `actividades_tipo_enum` (idempotente,
 *    mismo patrón DO $$ ... ADD VALUE IF NOT EXISTS que el resto del proyecto).
 * 2. Agrega la columna `metas.whatsapp` (int, default 0) para la meta mensual
 *    de envíos de WhatsApp.
 *
 * Idempotente: en una DB existente no altera datos, solo agrega lo que falta.
 */
export class WhatsappActividadSchema1787524214000 implements MigrationInterface {
  name = 'WhatsappActividadSchema1787524214000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Agregar 'whatsapp' a actividades_tipo_enum si no existe
    await queryRunner.query(
      `DO $$ BEGIN
         IF NOT EXISTS (
           SELECT 1 FROM pg_enum e
           JOIN pg_type t ON e.enumtypid = t.oid
           WHERE t.typname = 'actividades_tipo_enum' AND e.enumlabel = 'whatsapp'
         ) THEN
           ALTER TYPE actividades_tipo_enum ADD VALUE 'whatsapp';
         END IF;
       END $$;`
    );

    // 2. Columna metas.whatsapp
    await queryRunner.query(`
      ALTER TABLE "metas"
      ADD COLUMN IF NOT EXISTS "whatsapp" integer NOT NULL DEFAULT 0;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "metas" DROP COLUMN IF EXISTS "whatsapp";
    `);
  }
}
