import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migración "Firma / logo del vendedor para el pie de correos":
 * - Agrega la columna `vendedores.firma_url` (varchar) que guarda la URL de la
 *   imagen que cada vendedor/admin sube desde Configuración → Perfil.
 * - La imagen es ÚNICA por vendedor (al subir una nueva se sustituye la
 *   anterior) y se usa como pie de página en el correo que se envía al cliente.
 *
 * Idempotente (IF NOT EXISTS), igual que el resto de migraciones del proyecto.
 */
export class FirmaVendedorSchema1787524211000 implements MigrationInterface {
  name = 'FirmaVendedorSchema1787524211000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "vendedores"
      ADD COLUMN IF NOT EXISTS "firma_url" varchar;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "vendedores" DROP COLUMN IF EXISTS "firma_url";
    `);
  }
}
