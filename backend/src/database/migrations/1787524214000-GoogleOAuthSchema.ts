import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migración "Gmail OAuth2":
 * - Agrega a `vendedores` las columnas para guardar la cuenta de Google
 *   conectada por cada vendedor y sus tokens OAuth2:
 *     google_email          → correo de Gmail autorizado (visible)
 *     google_refresh_token  → token de larga duración (permite reenviar sin volver a autorizar)
 *     google_access_token   → token corto (se refresca automáticamente)
 *     google_token_expiry   → vencimiento del access token
 * - Los correos enviados desde el CRM salen desde la cuenta de Gmail del
 *   vendedor y quedan en su carpeta "Enviados".
 *
 * Idempotente (IF NOT EXISTS), igual que el resto de migraciones del proyecto.
 */
export class GoogleOAuthSchema1787524214000 implements MigrationInterface {
  name = 'GoogleOAuthSchema1787524214000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "vendedores"
      ADD COLUMN IF NOT EXISTS "google_email" varchar,
      ADD COLUMN IF NOT EXISTS "google_refresh_token" text,
      ADD COLUMN IF NOT EXISTS "google_access_token" text,
      ADD COLUMN IF NOT EXISTS "google_token_expiry" timestamptz;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "vendedores"
      DROP COLUMN IF EXISTS "google_email",
      DROP COLUMN IF EXISTS "google_refresh_token",
      DROP COLUMN IF EXISTS "google_access_token",
      DROP COLUMN IF EXISTS "google_token_expiry";
    `);
  }
}
