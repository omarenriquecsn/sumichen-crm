import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migración Atención en fin de semana (asistente de WhatsApp):
 *
 * Agrega a `menu_bienvenida` la configuración del flujo de fin de semana:
 *   - `fin_semana_activo`: activa/desactiva la respuesta automática de
 *     sábado/domingo para los leads de WhatsApp sin vendedor asignado.
 *   - `mensaje_fin_semana`: texto (editable) con el horario de atención.
 *
 * El lunes temprano un worker (`worker/finSemanaMonitor.ts`) reanuda el flujo
 * de asignación de los leads que quedaron pausados el fin de semana.
 *
 * Idempotente (checks de schema), igual que el resto de migraciones.
 */
export class FinSemanaSchema1787524218000 implements MigrationInterface {
  name = 'FinSemanaSchema1787524218000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'menu_bienvenida' AND column_name = 'fin_semana_activo'
        ) THEN
          ALTER TABLE "menu_bienvenida" ADD COLUMN "fin_semana_activo" boolean NOT NULL DEFAULT true;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'menu_bienvenida' AND column_name = 'mensaje_fin_semana'
        ) THEN
          ALTER TABLE "menu_bienvenida" ADD COLUMN "mensaje_fin_semana" text NOT NULL DEFAULT '¡Gracias por escribir a Sumichem! Nuestro horario de atención es de lunes a viernes de 8:00 a.m. a 5:00 p.m. En cuanto abramos, un asesor continuará atendiéndote.';
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "menu_bienvenida" DROP COLUMN IF EXISTS "mensaje_fin_semana"`);
    await queryRunner.query(`ALTER TABLE "menu_bienvenida" DROP COLUMN IF EXISTS "fin_semana_activo"`);
  }
}
