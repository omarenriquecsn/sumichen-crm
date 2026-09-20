import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migración "Instrumentos retornables" (paletas, tambores, baritanques,
 * carboyas...):
 * - Enums `estado_instrumento_enum` y `movimiento_instrumento_tipo_enum`.
 * - Catálogo `tipos_instrumento` (seed con los 4 tipos base).
 * - Existencias `instrumento_stock` por (tipo, almacén).
 * - Ledger `movimientos_instrumento`.
 * - Líneas de pedido `pedido_instrumentos` con contadores por estado.
 *
 * Idempotente (IF NOT EXISTS / INSERT ... WHERE NOT EXISTS).
 */
export class InstrumentosSchema1787524222000 implements MigrationInterface {
  name = 'InstrumentosSchema1787524222000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_instrumento_enum') THEN
          CREATE TYPE estado_instrumento_enum AS ENUM
            ('en_almacen', 'en_transito', 'en_cliente', 'donado', 'danado');
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'movimiento_instrumento_tipo_enum') THEN
          CREATE TYPE movimiento_instrumento_tipo_enum AS ENUM
            ('entrada', 'prestamo', 'entrega', 'devolucion', 'donacion', 'dano', 'ajuste', 'liberacion');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tipos_instrumento" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "nombre" varchar NOT NULL UNIQUE,
        "activo" boolean NOT NULL DEFAULT true,
        "fecha_creacion" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "instrumento_stock" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tipo_instrumento_id" uuid NOT NULL REFERENCES "tipos_instrumento"("id") ON DELETE CASCADE,
        "almacen" almacen_enum NOT NULL,
        "cantidad_total" numeric(12,2) NOT NULL DEFAULT 0,
        "cantidad_disponible" numeric(12,2) NOT NULL DEFAULT 0,
        CONSTRAINT "uq_instrumento_stock" UNIQUE ("tipo_instrumento_id", "almacen")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "movimientos_instrumento" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tipo" movimiento_instrumento_tipo_enum NOT NULL,
        "tipo_instrumento_id" uuid NOT NULL REFERENCES "tipos_instrumento"("id") ON DELETE CASCADE,
        "almacen" almacen_enum,
        "cliente_id" uuid REFERENCES "clientes"("id") ON DELETE SET NULL,
        "pedido_id" uuid REFERENCES "pedidos"("id") ON DELETE SET NULL,
        "cantidad" numeric(12,2) NOT NULL,
        "saldo_resultante" numeric(12,2) NOT NULL DEFAULT 0,
        "usuario_id" uuid,
        "observacion" text,
        "fecha_creacion" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_mov_instrumento_tipo"
        ON "movimientos_instrumento" ("tipo_instrumento_id", "fecha_creacion");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "pedido_instrumentos" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "pedido_id" uuid NOT NULL REFERENCES "pedidos"("id") ON DELETE CASCADE,
        "tipo_instrumento_id" uuid NOT NULL REFERENCES "tipos_instrumento"("id") ON DELETE CASCADE,
        "almacen" almacen_enum NOT NULL,
        "cantidad" numeric(12,2) NOT NULL,
        "cantidad_transito" numeric(12,2) NOT NULL DEFAULT 0,
        "cantidad_cliente" numeric(12,2) NOT NULL DEFAULT 0,
        "cantidad_almacen" numeric(12,2) NOT NULL DEFAULT 0,
        "cantidad_donada" numeric(12,2) NOT NULL DEFAULT 0,
        "cantidad_danada" numeric(12,2) NOT NULL DEFAULT 0,
        "estado" estado_instrumento_enum NOT NULL DEFAULT 'en_transito',
        "fecha_creacion" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_pedido_instrumentos_pedido"
        ON "pedido_instrumentos" ("pedido_id");
    `);

    // Seed del catálogo base (idempotente por nombre).
    for (const nombre of ['Paleta', 'Tambor', 'Baritanque', 'Carboya']) {
      await queryRunner.query(
        `INSERT INTO "tipos_instrumento" ("nombre")
         SELECT $1 WHERE NOT EXISTS (
           SELECT 1 FROM "tipos_instrumento" WHERE "nombre" = $1
         );`,
        [nombre],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "pedido_instrumentos";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "movimientos_instrumento";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "instrumento_stock";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tipos_instrumento";`);
    // No se eliminan los tipos enum.
  }
}
