import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migración "Evidencias múltiples por pedido":
 * - Crea la tabla `pedido_evidencias` (varios archivos por pedido).
 * - Cada fila guarda la metadata del archivo ORIGINAL (imagen/PDF/Excel/Word...)
 *   que se almacena en disco (`EVIDENCIA_UPLOAD_PATH`).
 * - `pedidos.evidencia_url` se conserva como campo legacy (PDF fusionado antiguo).
 *
 * Idempotente (IF NOT EXISTS), igual que el resto de migraciones del proyecto.
 */
export class PedidoEvidenciasSchema1787524217000 implements MigrationInterface {
  name = 'PedidoEvidenciasSchema1787524217000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "pedido_evidencias" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "pedido_id" uuid NOT NULL,
        "nombre_original" text NOT NULL,
        "archivo_nombre" text NOT NULL,
        "mime" character varying(150),
        "tamano" integer,
        "url" text NOT NULL,
        "subido_por_id" uuid,
        "fecha_creacion" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_pedido_evidencias" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_pedido_evidencias_pedido_id"
      ON "pedido_evidencias" ("pedido_id");
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_pedido_evidencias_pedido') THEN
          ALTER TABLE "pedido_evidencias"
          ADD CONSTRAINT "FK_pedido_evidencias_pedido"
          FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_pedido_evidencias_vendedor') THEN
          ALTER TABLE "pedido_evidencias"
          ADD CONSTRAINT "FK_pedido_evidencias_vendedor"
          FOREIGN KEY ("subido_por_id") REFERENCES "vendedores"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "pedido_evidencias" DROP CONSTRAINT IF EXISTS "FK_pedido_evidencias_vendedor"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pedido_evidencias" DROP CONSTRAINT IF EXISTS "FK_pedido_evidencias_pedido"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_pedido_evidencias_pedido_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "pedido_evidencias"`);
  }
}
