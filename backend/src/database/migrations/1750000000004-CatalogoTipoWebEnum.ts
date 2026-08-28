import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migración Catálogo (opción de intención del asistente de WhatsApp):
 *
 * 1. Agrega el valor 'catalogo' al enum `leads_tipo_web_enum` (idempotente,
 *    mismo patrón DO $$ ... ADD VALUE IF NOT EXISTS de la migración 1750000000002).
 * 2. Actualiza la fila de configuración `menu_bienvenida` existente:
 *    - `opciones_intencion` = solo Cotización y Catálogo (se eliminan
 *      Información y Soporte).
 *    - `mensaje_confirmacion` = texto por defecto que incluye el teléfono del
 *      vendedor ({telefono_vendedor}).
 *    - `mensaje_bienvenida` / `pregunta_intencion` se actualizan por si acaso
 *      quedaron con valores viejos, manteniendo el texto vigente.
 */
export class CatalogoTipoWebEnum1750000000004 implements MigrationInterface {
  name = 'CatalogoTipoWebEnum1750000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Agregar 'catalogo' a leads_tipo_web_enum si no existe
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum e
          JOIN pg_type t ON e.enumtypid = t.oid
          WHERE t.typname = 'leads_tipo_web_enum' AND e.enumlabel = 'catalogo'
        ) THEN
          ALTER TYPE leads_tipo_web_enum ADD VALUE 'catalogo';
        END IF;
      END $$;
    `);

    // 2. Actualizar la config existente del menú de bienvenida (fila única).
    //    Se preservan los textos personalizados del usuario (mensaje_bienvenida,
    //    pregunta_estado, mensaje_sin_vendedor, pregunta_intencion) salvo el de
    //    confirmación, que ahora debe incluir el teléfono del vendedor.
    await queryRunner.query(`
      UPDATE "menu_bienvenida"
      SET "opciones_intencion" = '[{"numero":1,"etiqueta":"Cotización","tipo_web":"cotizacion"},{"numero":2,"etiqueta":"Catálogo","tipo_web":"catalogo"}]'::jsonb,
          "mensaje_confirmacion" = '¡Listo, {nombre}! {vendedor} ({telefono_vendedor}) te contactará por este medio.'
      WHERE true;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No se revierte: eliminar valores de enum no es trivial y no aporta en dev.
  }
}
