import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migración "Personalizar menú lateral (sidebar)":
 * - Agrega la columna `vendedores.sidebar_oculto` (jsonb) que guarda el listado
 *   de rutas del menú que el usuario NO quiere ver (default `[]` = todo visible).
 *
 * Idempotente (IF NOT EXISTS), igual que el resto de migraciones del proyecto.
 * La columna viaja automáticamente en GET /usuarios/:id y se actualiza desde
 * Configuración → Sidebar vía PUT /usuarios/perfil.
 */
export class SidebarPreferenciasSchema1787524210000 implements MigrationInterface {
  name = 'SidebarPreferenciasSchema1787524210000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "vendedores"
      ADD COLUMN IF NOT EXISTS "sidebar_oculto" jsonb NOT NULL DEFAULT '[]'::jsonb;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "vendedores" DROP COLUMN IF EXISTS "sidebar_oculto";
    `);
  }
}
