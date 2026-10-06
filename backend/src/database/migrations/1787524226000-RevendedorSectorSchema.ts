import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migración Sector "Revendedores":
 *
 * - `clientes_sector_enum`: agrega el valor 'Revendedores' al enum de sectores
 *   de clientes (CustomerSector).
 *
 * Idempotente: revisa pg_enum antes de alterar, igual que el resto de
 * migraciones.
 *
 * NOTA: NO usar el nuevo valor de enum dentro de este mismo run (los valores
 * de enum quedan disponibles al commit de la transacción).
 */
export class RevendedorSectorSchema1787524226000 implements MigrationInterface {
  name = 'RevendedorSectorSchema1787524226000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN
         IF NOT EXISTS (
           SELECT 1 FROM pg_enum e
           JOIN pg_type t ON e.enumtypid = t.oid
           WHERE t.typname = 'clientes_sector_enum' AND e.enumlabel = 'Revendedores'
         ) THEN
           ALTER TYPE clientes_sector_enum ADD VALUE 'Revendedores';
         END IF;
       END $$;`,
    );
  }

  public async down(): Promise<void> {
    // No se revierte el valor de enum (no es trivial y no aporta en dev)
  }
}
