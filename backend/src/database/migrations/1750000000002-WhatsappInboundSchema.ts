import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migración Fase 2 (Webhook WhatsApp entrante): amplía los enums de `leads`
 * para admitir el canal WhatsApp.
 *
 * - `leads_origen_enum`: se agrega el valor 'whatsapp'.
 * - `leads_canal_entrada_enum`: se agrega el valor 'whatsapp_mensaje'.
 *
 * Idempotente: verifica en pg_enum antes de hacer ALTER TYPE, así funciona
 * tanto en una DB que ya aplicó la migración como en una nueva.
 *
 * NOTA: NO usar las nuevas columnas/valores dentro del mismo run de
 * migración; los valores quedan disponibles al commit de la transacción.
 */
export class WhatsappInboundSchema1750000000002 implements MigrationInterface {
  name = 'WhatsappInboundSchema1750000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const sqls: string[] = [
      // Agregar 'whatsapp' a leads_origen_enum si no existe
      `DO $$ BEGIN
         IF NOT EXISTS (
           SELECT 1 FROM pg_enum e
           JOIN pg_type t ON e.enumtypid = t.oid
           WHERE t.typname = 'leads_origen_enum' AND e.enumlabel = 'whatsapp'
         ) THEN
           ALTER TYPE leads_origen_enum ADD VALUE 'whatsapp';
         END IF;
       END $$;`,
      // Agregar 'whatsapp_mensaje' a leads_canal_entrada_enum si no existe
      `DO $$ BEGIN
         IF NOT EXISTS (
           SELECT 1 FROM pg_enum e
           JOIN pg_type t ON e.enumtypid = t.oid
           WHERE t.typname = 'leads_canal_entrada_enum' AND e.enumlabel = 'whatsapp_mensaje'
         ) THEN
           ALTER TYPE leads_canal_entrada_enum ADD VALUE 'whatsapp_mensaje';
         END IF;
       END $$;`,
    ];

    for (const sql of sqls) {
      await queryRunner.query(sql);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No se revierte (eliminar valores de enum no es trivial y no aporta en dev)
  }
}
