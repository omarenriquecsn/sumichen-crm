import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migración "Metas únicas por mes":
 * - Elimina metas duplicadas del mismo (vendedor_id, mes, ano), conservando la
 *   más reciente (fecha_actualizacion, luego id como desempate).
 * - Crea un índice UNIQUE sobre (vendedor_id, mes, ano) para garantizar que
 *   una nueva asignación del mismo mes sustituya a la anterior (el servicio
 *   createMetasService hace el upsert, esto es la salvaguarda a nivel DB).
 *
 * Idempotente (IF NOT EXISTS) e idempotente en la limpieza (si no hay
 * duplicados no borra nada).
 */
export class MetasUnicasSchema1787524227000 implements MigrationInterface {
  name = 'MetasUnicasSchema1787524227000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Limpieza: borra duplicados conservando el más reciente por (vendedor, mes, año).
    await queryRunner.query(`
      DELETE FROM "metas" m
      USING "metas" dup
      WHERE m."vendedor_id" = dup."vendedor_id"
        AND m."mes" = dup."mes"
        AND m."ano" = dup."ano"
        AND (m."fecha_actualizacion", m."id") < (dup."fecha_actualizacion", dup."id");
    `);

    // 2) Salvaguarda a nivel DB: una sola meta por vendedor/mes/año.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_metas_vendedor_mes_ano"
      ON "metas" ("vendedor_id", "mes", "ano");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "uq_metas_vendedor_mes_ano";
    `);
  }
}
