import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migración Confirmación del vendedor (asistente de WhatsApp):
 *
 * El mensaje `pregunta_intencion` se envía justo después de asignar al
 * vendedor, por lo que en la práctica es una confirmación con los datos del
 * vendedor. Ahora soporta `{telefono_vendedor}` (y `{nombre}`) además de
 * `{vendedor}`, `{zona}` y `{opciones}`.
 *
 * - Actualiza el DEFAULT de la columna `pregunta_intencion`.
 * - Actualiza la fila existente SOLO si todavía tiene el texto por defecto
 *   anterior (no pisa personalizaciones del usuario).
 *
 * Idempotente.
 */
export class ConfirmacionVendedorSchema1787524219000 implements MigrationInterface {
  name = 'ConfirmacionVendedorSchema1787524219000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const nuevo =
      '{vendedor} ({telefono_vendedor}) de la zona {zona} te atenderá. ¿Qué necesitas?\n{opciones}';

    // DEFAULT de la columna (el DDL no admite parámetros; se usa E'...' para
    // que \n sea un salto de línea real igual que el valor de la entidad).
    await queryRunner.query(
      `ALTER TABLE "menu_bienvenida" ALTER COLUMN "pregunta_intencion" SET DEFAULT E'{vendedor} ({telefono_vendedor}) de la zona {zona} te atenderá. ¿Qué necesitas?\\n{opciones}'`
    );

    // Fila existente: solo si sigue con el valor por defecto anterior.
    await queryRunner.query(
      `UPDATE "menu_bienvenida"
         SET "pregunta_intencion" = $1
       WHERE "pregunta_intencion" LIKE '{vendedor} de la zona {zona} te atenderá%'`,
      [nuevo]
    );
  }

  public async down(): Promise<void> {
    // No se revierte: el cambio de texto es inocuo.
  }
}
