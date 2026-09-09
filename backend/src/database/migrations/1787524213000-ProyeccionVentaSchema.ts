import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migración "Proyección de ventas por cliente":
 * - Agrega la columna `clientes.proyeccion_venta` (numeric) con la proyección
 *   de venta que se carga por Excel (RIF + proyección).
 * - La columna SOLO se modifica vía el endpoint POST /clientes/proyecciones
 *   (la ruta genérica PUT /clientes/:id la ignora).
 * - El porcentaje alcanzado NO se guarda: se calcula en vivo comparando los
 *   pedidos `procesado` del cliente contra esta proyección.
 *
 * Idempotente (IF NOT EXISTS), igual que el resto de migraciones del proyecto.
 */
export class ProyeccionVentaSchema1787524213000 implements MigrationInterface {
  name = 'ProyeccionVentaSchema1787524213000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "clientes"
      ADD COLUMN IF NOT EXISTS "proyeccion_venta" numeric(14, 2);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "clientes" DROP COLUMN IF EXISTS "proyeccion_venta";
    `);
  }
}
