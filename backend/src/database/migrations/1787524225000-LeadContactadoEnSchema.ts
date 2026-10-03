import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migración tiempo de respuesta de leads:
 *
 * Agrega `leads.contactado_en`, el momento exacto en que el vendedor pulsó
 * "Atender por WhatsApp" (el lead pasó a `contactado` por primera vez). Sirve
 * para calcular el tiempo de respuesta real (contactado_en - asignado_en) en el
 * dashboard de marketing.
 *
 * Idempotente: usa IF NOT EXISTS, igual que el resto de migraciones.
 */
export class LeadContactadoEnSchema1787524225000 implements MigrationInterface {
  name = 'LeadContactadoEnSchema1787524225000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "contactado_en" timestamptz NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "leads" DROP COLUMN IF EXISTS "contactado_en"`,
    );
  }
}
