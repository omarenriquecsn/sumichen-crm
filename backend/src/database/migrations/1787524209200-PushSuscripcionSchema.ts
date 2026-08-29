import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migración Web Push (PWA):
 * - Crea la tabla `push_suscripciones` (una fila por dispositivo del usuario
 *   con notificaciones habilitadas).
 *
 * Idempotente (IF NOT EXISTS), igual que el resto de migraciones del proyecto.
 */
export class PushSuscripcionSchema1787524209200 implements MigrationInterface {
  name = 'PushSuscripcionSchema1787524209200';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "push_suscripciones" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "vendedor_id" uuid NOT NULL,
        "endpoint" text NOT NULL UNIQUE,
        "p256dh" text NOT NULL,
        "auth" text NOT NULL,
        "dispositivo" text,
        "fecha_creacion" timestamptz NOT NULL DEFAULT now(),
        "fecha_actualizacion" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_push_suscripciones_vendedor" FOREIGN KEY ("vendedor_id")
          REFERENCES "vendedores"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_push_suscripciones_vendedor"
      ON "push_suscripciones" ("vendedor_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_push_suscripciones_vendedor"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "push_suscripciones"`);
  }
}
