import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migración Tipo de Contacto (menú inicial del asistente de WhatsApp):
 *
 * 1. Agrega los valores 'proveedor' y 'trabajo' al enum `leads_tipo_web_enum`
 *    (idempotente, mismo patrón DO $$ ... ADD VALUE IF NOT EXISTS).
 * 2. Agrega a `menu_bienvenida` las columnas del nuevo paso "tipo de contacto":
 *    - `mensaje_tipo_contacto`: texto que pregunta si es cliente, proveedor o
 *      busca trabajo ({opciones}).
 *    - `vendedor_proveedores_id`: usuario (vendedor/admin) que recibe proveedores.
 *    - `vendedor_trabajo_id`: usuario (vendedor/admin) que recibe postulantes.
 *    - `mensaje_proveedor` / `mensaje_trabajo`: confirmaciones al contacto.
 * 3. Actualiza la fila única existente con los textos por defecto (no pisa los
 *    campos previos ya guardados).
 */
export class TipoContactoSchema1750000000005 implements MigrationInterface {
  name = 'TipoContactoSchema1750000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Agregar 'proveedor' y 'trabajo' a leads_tipo_web_enum si no existen
    for (const valor of ['proveedor', 'trabajo']) {
      await queryRunner.query(
        `DO $$ BEGIN
           IF NOT EXISTS (
             SELECT 1 FROM pg_enum e
             JOIN pg_type t ON e.enumtypid = t.oid
             WHERE t.typname = 'leads_tipo_web_enum' AND e.enumlabel = '${valor}'
           ) THEN
             ALTER TYPE leads_tipo_web_enum ADD VALUE '${valor}';
           END IF;
         END $$;`
      );
    }

    // 2. Columnas nuevas en menu_bienvenida (idempotente)
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'menu_bienvenida' AND column_name = 'mensaje_tipo_contacto'
        ) THEN
          ALTER TABLE "menu_bienvenida" ADD COLUMN "mensaje_tipo_contacto" text NOT NULL DEFAULT '¡Hola {nombre}! ¿Cómo podemos ayudarte?\n{opciones}';
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'menu_bienvenida' AND column_name = 'vendedor_proveedores_id'
        ) THEN
          ALTER TABLE "menu_bienvenida" ADD COLUMN "vendedor_proveedores_id" uuid;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'menu_bienvenida' AND column_name = 'vendedor_trabajo_id'
        ) THEN
          ALTER TABLE "menu_bienvenida" ADD COLUMN "vendedor_trabajo_id" uuid;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'menu_bienvenida' AND column_name = 'mensaje_proveedor'
        ) THEN
          ALTER TABLE "menu_bienvenida" ADD COLUMN "mensaje_proveedor" text NOT NULL DEFAULT 'Gracias {nombre}. {vendedor} se comunicará contigo por este medio.';
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'menu_bienvenida' AND column_name = 'mensaje_trabajo'
        ) THEN
          ALTER TABLE "menu_bienvenida" ADD COLUMN "mensaje_trabajo" text NOT NULL DEFAULT 'Gracias {nombre}. {vendedor} se comunicará contigo por este medio.';
        END IF;
      END $$;
    `);

    // 3. FK de los vendedores configurados (si no existen ya)
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'menu_bienvenida_vendedor_proveedores_id_fkey'
        ) THEN
          ALTER TABLE "menu_bienvenida"
            ADD CONSTRAINT "menu_bienvenida_vendedor_proveedores_id_fkey"
            FOREIGN KEY ("vendedor_proveedores_id") REFERENCES "vendedores"("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'menu_bienvenida_vendedor_trabajo_id_fkey'
        ) THEN
          ALTER TABLE "menu_bienvenida"
            ADD CONSTRAINT "menu_bienvenida_vendedor_trabajo_id_fkey"
            FOREIGN KEY ("vendedor_trabajo_id") REFERENCES "vendedores"("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    // 4. Actualizar la fila única existente con los textos por defecto
    await queryRunner.query(`
      UPDATE "menu_bienvenida"
      SET "mensaje_tipo_contacto" = '¡Hola {nombre}! ¿Cómo podemos ayudarte?\n{opciones}',
          "mensaje_proveedor" = 'Gracias {nombre}. {vendedor} se comunicará contigo por este medio.',
          "mensaje_trabajo" = 'Gracias {nombre}. {vendedor} se comunicará contigo por este medio.'
      WHERE true;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No se revierte: eliminar valores de enum / columnas no aporta en dev.
  }
}
