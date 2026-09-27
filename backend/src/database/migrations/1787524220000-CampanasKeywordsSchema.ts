import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migración Campañas / palabras clave de origen:
 *
 * - `leads_origen_enum`: agrega el valor 'desconocido' (leads de WhatsApp cuyo
 *   primer mensaje no contiene ninguna palabra clave reconocible).
 * - `leads.palabra_clave`: palabra clave de campaña detectada en el primer
 *   mensaje del lead (varchar, nullable).
 * - Tabla `campanas`: catálogo administrable de palabras clave de campañas
 *   publicitarias (palabra_clave única, descripción y activa).
 *
 * Idempotente: revisa pg_enum / information_schema antes de alterar, igual que
 * el resto de migraciones.
 *
 * NOTA: NO usar el nuevo valor de enum dentro de este mismo run (los valores
 * de enum quedan disponibles al commit de la transacción).
 */
export class CampanasKeywordsSchema1787524220000 implements MigrationInterface {
  name = 'CampanasKeywordsSchema1787524220000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const sqls: string[] = [
      // Agregar 'desconocido' a leads_origen_enum si no existe
      `DO $$ BEGIN
         IF NOT EXISTS (
           SELECT 1 FROM pg_enum e
           JOIN pg_type t ON e.enumtypid = t.oid
           WHERE t.typname = 'leads_origen_enum' AND e.enumlabel = 'desconocido'
         ) THEN
           ALTER TYPE leads_origen_enum ADD VALUE 'desconocido';
         END IF;
       END $$;`,

      // Columna palabra_clave en leads
      `DO $$ BEGIN
         IF NOT EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_name = 'leads' AND column_name = 'palabra_clave'
         ) THEN
           ALTER TABLE "leads" ADD COLUMN "palabra_clave" varchar(255) NULL;
         END IF;
       END $$;`,

      // Tabla campanas
      `CREATE TABLE IF NOT EXISTS campanas (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        palabra_clave varchar(255) NOT NULL,
        descripcion varchar(255) NULL,
        activa boolean NOT NULL DEFAULT true,
        fecha_creacion timestamptz NOT NULL DEFAULT now(),
        fecha_actualizacion timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_campanas_palabra_clave UNIQUE (palabra_clave)
      );`,

      // Índices
      `CREATE INDEX IF NOT EXISTS idx_leads_palabra_clave ON leads(palabra_clave);`,
      `CREATE INDEX IF NOT EXISTS idx_campanas_activa ON campanas(activa);`,
    ];

    for (const sql of sqls) {
      await queryRunner.query(sql);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No se revierte el valor de enum (no es trivial y no aporta en dev)
    await queryRunner.query(`DROP TABLE IF EXISTS "campanas"`);
    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN IF EXISTS "palabra_clave"`);
  }
}
