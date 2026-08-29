import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migración acceso biométrico (WebAuthn / passkey):
 * - Crea la tabla `credenciales_biometricas` (passkeys de los usuarios para
 *   iniciar sesión con huella/rostro en dispositivos compatibles).
 *
 * Idempotente (IF NOT EXISTS), igual que el resto de migraciones del proyecto.
 */
export class CredencialBiometricaSchema1787524209300 implements MigrationInterface {
  name = 'CredencialBiometricaSchema1787524209300';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "credenciales_biometricas" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "supabase_id" uuid NOT NULL,
        "credential_id" text NOT NULL UNIQUE,
        "public_key" text NOT NULL,
        "counter" integer NOT NULL DEFAULT 0,
        "dispositivo" text,
        "fecha_creacion" timestamptz NOT NULL DEFAULT now(),
        "fecha_actualizacion" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_credenciales_biometricas_supabase"
      ON "credenciales_biometricas" ("supabase_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_credenciales_biometricas_supabase"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "credenciales_biometricas"`);
  }
}
