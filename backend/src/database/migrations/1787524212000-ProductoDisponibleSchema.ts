import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migración "Disponibilidad de productos":
 * - Agrega la columna `productos.disponible` (boolean, default true) que marca
 *   si el producto tiene stock según el inventario diario (inventario.xlsx).
 *   La sincroniza el endpoint POST /productos/excel (solo admin).
 *
 * Idempotente (IF NOT EXISTS), igual que el resto de migraciones del proyecto.
 */
export class ProductoDisponibleSchema1787524212000 implements MigrationInterface {
  name = 'ProductoDisponibleSchema1787524212000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "productos"
      ADD COLUMN IF NOT EXISTS "disponible" boolean NOT NULL DEFAULT true;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "productos" DROP COLUMN IF EXISTS "disponible";
    `);
  }
}
