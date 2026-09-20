import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migración "Inventario por lotes y almacenes + devoluciones":
 *
 * - Enums nuevos: `almacen_enum`, `movimiento_inventario_tipo_enum`,
 *   `devolucion_tipo_enum`.
 * - Valores nuevos en `pedidos_estado_enum`: 'devuelto', 'devuelto_parcial'.
 * - Columnas: `productos_pedido.almacen`, `productos_pedido.cantidad_devuelta`
 *   y `pedidos.total_devuelto`.
 * - Tablas: `lotes`, `movimientos_inventario`, `devoluciones` y
 *   `devoluciones_detalle`.
 *
 * Idempotente (IF NOT EXISTS / DO $$), igual que el resto de migraciones.
 */
export class InventarioLotesSchema1787524219000 implements MigrationInterface {
  name = 'InventarioLotesSchema1787524219000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ------------------------------ Enums ------------------------------
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'almacen_enum') THEN
          CREATE TYPE almacen_enum AS ENUM ('globalca', 'wms');
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'movimiento_inventario_tipo_enum') THEN
          CREATE TYPE movimiento_inventario_tipo_enum AS ENUM
            ('entrada', 'reserva', 'salida', 'liberacion', 'devolucion', 'ajuste');
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'devolucion_tipo_enum') THEN
          CREATE TYPE devolucion_tipo_enum AS ENUM ('total', 'parcial');
        END IF;
      END $$;
    `);

    // Nuevos estados del pedido (idempotente, patrón DO $$ ADD VALUE).
    for (const valor of ['devuelto', 'devuelto_parcial']) {
      await queryRunner.query(`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_enum e
            JOIN pg_type t ON e.enumtypid = t.oid
            WHERE t.typname = 'pedidos_estado_enum' AND e.enumlabel = '${valor}'
          ) THEN
            ALTER TYPE pedidos_estado_enum ADD VALUE '${valor}';
          END IF;
        END $$;
      `);
    }

    // --------------------------- Columnas ------------------------------
    await queryRunner.query(`
      ALTER TABLE "productos_pedido"
        ADD COLUMN IF NOT EXISTS "almacen" almacen_enum;
    `);
    await queryRunner.query(`
      ALTER TABLE "productos_pedido"
        ADD COLUMN IF NOT EXISTS "cantidad_devuelta" numeric(12,2) NOT NULL DEFAULT 0;
    `);
    await queryRunner.query(`
      ALTER TABLE "pedidos"
        ADD COLUMN IF NOT EXISTS "total_devuelto" numeric(12,2) NOT NULL DEFAULT 0;
    `);

    // ----------------------------- Lotes -------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "lotes" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "producto_id" uuid NOT NULL REFERENCES "productos"("id") ON DELETE CASCADE,
        "almacen" almacen_enum NOT NULL,
        "codigo_lote" varchar NOT NULL,
        "fecha_ingreso" date NOT NULL,
        "cantidad_inicial" numeric(12,2) NOT NULL DEFAULT 0,
        "cantidad_actual" numeric(12,2) NOT NULL DEFAULT 0,
        "activo" boolean NOT NULL DEFAULT true,
        "fecha_creacion" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_lotes_producto_almacen_lote"
          UNIQUE ("producto_id", "almacen", "codigo_lote")
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_lotes_fifo"
        ON "lotes" ("producto_id", "almacen", "fecha_ingreso");
    `);

    // --------------------- Movimientos de inventario -------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "movimientos_inventario" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tipo" movimiento_inventario_tipo_enum NOT NULL,
        "producto_id" uuid NOT NULL REFERENCES "productos"("id") ON DELETE CASCADE,
        "lote_id" uuid REFERENCES "lotes"("id") ON DELETE SET NULL,
        "almacen" almacen_enum,
        "pedido_id" uuid REFERENCES "pedidos"("id") ON DELETE SET NULL,
        "devolucion_id" uuid,
        "cantidad" numeric(12,2) NOT NULL,
        "saldo_resultante" numeric(12,2) NOT NULL DEFAULT 0,
        "usuario_id" uuid,
        "observacion" text,
        "fecha_creacion" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_mov_producto"
        ON "movimientos_inventario" ("producto_id", "fecha_creacion");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_mov_pedido"
        ON "movimientos_inventario" ("pedido_id");
    `);

    // --------------------------- Devoluciones --------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "devoluciones" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "pedido_id" uuid NOT NULL REFERENCES "pedidos"("id") ON DELETE CASCADE,
        "tipo" devolucion_tipo_enum NOT NULL,
        "motivo" text,
        "notas" text,
        "usuario_id" uuid REFERENCES "vendedores"("id") ON DELETE SET NULL,
        "total_devuelto" numeric(12,2) NOT NULL DEFAULT 0,
        "fecha_creacion" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_dev_pedido"
        ON "devoluciones" ("pedido_id");
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "devoluciones_detalle" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "devolucion_id" uuid NOT NULL REFERENCES "devoluciones"("id") ON DELETE CASCADE,
        "productos_pedido_id" uuid REFERENCES "productos_pedido"("id") ON DELETE SET NULL,
        "producto_id" uuid NOT NULL REFERENCES "productos"("id") ON DELETE CASCADE,
        "almacen" almacen_enum NOT NULL,
        "lote_id" uuid REFERENCES "lotes"("id") ON DELETE SET NULL,
        "cantidad" numeric(12,2) NOT NULL
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_devdet_dev"
        ON "devoluciones_detalle" ("devolucion_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "devoluciones_detalle";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "devoluciones";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "movimientos_inventario";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "lotes";`);
    await queryRunner.query(`
      ALTER TABLE "pedidos" DROP COLUMN IF EXISTS "total_devuelto";
    `);
    await queryRunner.query(`
      ALTER TABLE "productos_pedido" DROP COLUMN IF EXISTS "cantidad_devuelta";
    `);
    await queryRunner.query(`
      ALTER TABLE "productos_pedido" DROP COLUMN IF EXISTS "almacen";
    `);
    // No se eliminan tipos enum (revertirlos no aporta).
  }
}
