import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Preferencias de notificación push (PWA) por evento:
 * - Crea la tabla `preferencias_notificaciones`: una fila por (vendedor, evento)
 *   con `habilitado` (default true). Si no existe fila → el evento está habilitado.
 * - Agrega `recordatorio_enviado` / `recordatorio_enviado_en` a `actividades`
 *   para que el worker de recordatorios no repita avisos.
 *
 * Idempotente (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS), igual que el resto de
 * migraciones del proyecto.
 */
export class PreferenciasNotificacionesSchema1787524209500 implements MigrationInterface {
  name = 'PreferenciasNotificacionesSchema1787524209500';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "preferencias_notificaciones" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "vendedor_id" uuid NOT NULL,
        "evento" character varying(40) NOT NULL,
        "habilitado" boolean NOT NULL DEFAULT true,
        "fecha_creacion" timestamptz NOT NULL DEFAULT now(),
        "fecha_actualizacion" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_preferencias_vendedor_evento" UNIQUE ("vendedor_id", "evento"),
        CONSTRAINT "FK_preferencias_notificaciones_vendedor" FOREIGN KEY ("vendedor_id")
          REFERENCES "vendedores"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_preferencias_notificaciones_vendedor"
      ON "preferencias_notificaciones" ("vendedor_id");
    `);

    await queryRunner.query(
      `ALTER TABLE "actividades" ADD COLUMN IF NOT EXISTS "recordatorio_enviado" boolean NOT NULL DEFAULT false`
    );
    await queryRunner.query(
      `ALTER TABLE "actividades" ADD COLUMN IF NOT EXISTS "recordatorio_enviado_en" timestamptz`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_preferencias_notificaciones_vendedor"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "preferencias_notificaciones"`);
    await queryRunner.query(`ALTER TABLE "actividades" DROP COLUMN IF EXISTS "recordatorio_enviado_en"`);
    await queryRunner.query(`ALTER TABLE "actividades" DROP COLUMN IF EXISTS "recordatorio_enviado"`);
  }
}
