import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migración Diario de negociación de leads:
 *
 * Crea la tabla `lead_notas`, un historial (diario) de notas de progreso de la
 * negociación con el cliente. Cada entrada guarda el autor (vendedor) y la
 * fecha, de modo que el vendedor pueda anotar por qué no se dio la negociación,
 * si el cliente mostró interés, etc.
 *
 * Idempotente: usa IF NOT EXISTS, igual que el resto de migraciones.
 */
export class LeadNotasSchema1787524224000 implements MigrationInterface {
  name = 'LeadNotasSchema1787524224000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const sqls: string[] = [
      `CREATE TABLE IF NOT EXISTS "lead_notas" (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        lead_id uuid NOT NULL,
        vendedor_id uuid NULL,
        contenido text NOT NULL,
        fecha_creacion timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_lead_notas_lead FOREIGN KEY (lead_id)
          REFERENCES "leads"(id) ON DELETE CASCADE,
        CONSTRAINT fk_lead_notas_vendedor FOREIGN KEY (vendedor_id)
          REFERENCES "vendedores"(id) ON DELETE SET NULL
      );`,

      `CREATE INDEX IF NOT EXISTS idx_lead_notas_lead_fecha
        ON "lead_notas"(lead_id, fecha_creacion);`,
    ];

    for (const sql of sqls) {
      await queryRunner.query(sql);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "lead_notas"`);
  }
}
