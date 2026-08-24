import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migración Asistente de Bienvenida (WhatsApp):
 *
 * - Crea la tabla `menu_bienvenida` (configuración editable del asistente
 *   automático que pregunta al lead sin vendedor de qué estado escribe y lo
 *   auto-asigna al vendedor de la zona correspondiente).
 * - Agrega la columna `estados` (jsonb) a `zonas`: lista de estados
 *   venezolanos que cubre cada zona (mapeo estado → zona para el asistente).
 * - Siembra un `menu_bienvenida` por defecto y un mapeo de estados razonable
 *   para las zonas existentes (editable desde el panel).
 *
 * Idempotente (todo con IF NOT EXISTS / checks de schema), igual que el baseline.
 */
export class MenuBienvenidaSchema1750000000003 implements MigrationInterface {
  name = 'MenuBienvenidaSchema1750000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Tabla menu_bienvenida (configuración de fila única)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "menu_bienvenida" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "activo" boolean NOT NULL DEFAULT true,
        "mensaje_bienvenida" text NOT NULL DEFAULT '¡Hola {nombre}! Gracias por escribir a Sumichem. Para atenderte mejor necesitamos saber tu ubicación.',
        "pregunta_estado" text NOT NULL DEFAULT '¿De qué estado nos escribes? Responde con el número:\n{opciones}',
        "mensaje_sin_vendedor" text NOT NULL DEFAULT 'Gracias por tu información, {nombre}. Un asesor te contactará muy pronto.',
        "pregunta_intencion" text NOT NULL DEFAULT '{vendedor} de la zona {zona} te atenderá. ¿Qué necesitas?\n{opciones}',
        "mensaje_confirmacion" text NOT NULL DEFAULT '¡Listo, {nombre}! En breve {vendedor} te contactará por este medio.',
        "opciones_intencion" jsonb NOT NULL DEFAULT '[{"numero":1,"etiqueta":"Cotización","tipo_web":"cotizacion"},{"numero":2,"etiqueta":"Información","tipo_web":"informacion"},{"numero":3,"etiqueta":"Soporte","tipo_web":"soporte"}]',
        "fecha_creacion" timestamptz NOT NULL DEFAULT now(),
        "fecha_actualizacion" timestamptz NOT NULL DEFAULT now()
      );
    `);

    // 2. Columna estados en zonas (jsonb) si no existe
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'zonas' AND column_name = 'estados'
        ) THEN
          ALTER TABLE "zonas" ADD COLUMN "estados" jsonb NOT NULL DEFAULT '[]'::jsonb;
        END IF;
      END $$;
    `);

    // 3. Fila por defecto de menu_bienvenida (solo si la tabla quedó vacía)
    await queryRunner.query(`
      INSERT INTO "menu_bienvenida" ("id", "activo", "mensaje_bienvenida", "pregunta_estado", "mensaje_sin_vendedor", "pregunta_intencion", "mensaje_confirmacion", "opciones_intencion")
      SELECT gen_random_uuid(), true,
        '¡Hola {nombre}! Gracias por escribir a Sumichem. Para atenderte mejor necesitamos saber tu ubicación.',
        '¿De qué estado nos escribes? Responde con el número:\n{opciones}',
        'Gracias por tu información, {nombre}. Un asesor te contactará muy pronto.',
        '{vendedor} de la zona {zona} te atenderá. ¿Qué necesitas?\n{opciones}',
        '¡Listo, {nombre}! En breve {vendedor} te contactará por este medio.',
        '[{"numero":1,"etiqueta":"Cotización","tipo_web":"cotizacion"},{"numero":2,"etiqueta":"Información","tipo_web":"informacion"},{"numero":3,"etiqueta":"Soporte","tipo_web":"soporte"}]'
      WHERE NOT EXISTS (SELECT 1 FROM "menu_bienvenida");
    `);

    // 4. Seed de estados por zona (solo donde aún no se configuró nada).
    //    ⚠ Mapeo por defecto editable en /zonas; zonas con ciudades/municipios
    //    (Guarenas, Guatire, Maracay) quedan sin estados para evitar solapamientos.
    const estadosSeed: Array<[string, string[]]> = [
      ['Centro Occidente', ['Falcón', 'Lara', 'Portuguesa', 'Yaracuy']],
      ['Llanos', ['Cojedes', 'Barinas']],
      ['Centro', ['Carabobo', 'Aragua']],
      ['Oriente', ['Sucre', 'Monagas', 'Anzoátegui', 'Nueva Esparta']],
      ['Miranda', ['Miranda', 'Distrito Capital']],
      ['La Guaira', ['La Guaira']],
      ['Guarico', ['Guárico']],
      ['Apure', ['Apure']],
      ['Maracaibo', ['Zulia']],
      ['Guarenas', []],
      ['Guatire', []],
      ['Maracay', []],
    ];

    for (const [zona, estados] of estadosSeed) {
      await queryRunner.query(
        `UPDATE "zonas"
           SET "estados" = $1::jsonb
           WHERE "nombre" = $2 AND (jsonb_array_length(COALESCE("estados", '[]'::jsonb)) = 0)`,
        [JSON.stringify(estados), zona]
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "zonas" DROP COLUMN IF EXISTS "estados"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "menu_bienvenida"`);
  }
}
