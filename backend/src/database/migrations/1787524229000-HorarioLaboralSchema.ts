import { MigrationInterface, QueryRunner } from 'typeorm';
import { calcularVencimientoSLA } from '../../utils/horarioLaboralBase';

/**
 * Migración del flujo fuera de horario + SLA en horas laborales:
 *
 * - Tabla `dias_no_laborables`: feriados que no cuentan para el horario
 *   laboral (ni para la atención del asistente ni para el SLA). Un feriado
 *   puede ser exacto (`recurrente_anual = false`) o repetirse cada año
 *   (`recurrente_anual = true`, se compara mes-día).
 * - Columna `leads.sla_vence_en`: vencimiento del SLA calculado al asignar o
 *   reasignar. Es fijo (no se reinicia con actividad) y corresponde al
 *   siguiente día hábil a la misma hora de la asignación, ajustado a 8-17.
 * - Backfill de los leads activos para que no queden sin vencimiento.
 *
 * Idempotente (IF NOT EXISTS / ON CONFLICT), igual que el resto de migraciones.
 */
export class HorarioLaboralSchema1787524229000 implements MigrationInterface {
  name = 'HorarioLaboralSchema1787524229000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const sqls: string[] = [
      `DO $$ BEGIN
         IF NOT EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_name = 'leads' AND column_name = 'sla_vence_en'
         ) THEN
           ALTER TABLE "leads" ADD COLUMN "sla_vence_en" timestamptz NULL;
         END IF;
       END $$;`,

      `CREATE INDEX IF NOT EXISTS idx_leads_sla_vence_en ON leads(sla_vence_en);`,

      `CREATE TABLE IF NOT EXISTS dias_no_laborables (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        fecha date NOT NULL,
        descripcion varchar(255) NULL,
        recurrente_anual boolean NOT NULL DEFAULT false,
        fecha_creacion timestamptz NOT NULL DEFAULT now(),
        fecha_actualizacion timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT ux_dias_no_laborables_fecha UNIQUE (fecha)
      );`,

      `CREATE INDEX IF NOT EXISTS idx_dias_no_laborables_recurrente ON dias_no_laborables(recurrente_anual);`,

      // Feriados nacionales fijos de Venezuela (se repiten cada año). Se usa el
      // año 2000 como referencia; la comparación real es mes-día.
      `INSERT INTO dias_no_laborables (fecha, descripcion, recurrente_anual) VALUES
         ('2000-01-01', 'Año Nuevo', true),
         ('2000-05-01', 'Día del Trabajador', true),
         ('2000-06-24', 'Batalla de Carabobo', true),
         ('2000-07-05', 'Día de la Independencia', true),
         ('2000-07-24', 'Natalicio de Simón Bolívar', true),
         ('2000-10-12', 'Día de la Resistencia Indígena', true),
         ('2000-12-24', 'Nochebuena', true),
         ('2000-12-25', 'Navidad', true),
         ('2000-12-31', 'Fin de año', true)
       ON CONFLICT (fecha) DO NOTHING;`,

      // Feriados móviles 2026 (Carnaval y Semana Santa). Los años siguientes se
      // administran desde Marketing -> Días no laborables.
      `INSERT INTO dias_no_laborables (fecha, descripcion, recurrente_anual) VALUES
         ('2026-02-16', 'Carnaval (lunes)', false),
         ('2026-02-17', 'Carnaval (martes)', false),
         ('2026-04-02', 'Jueves Santo', false),
         ('2026-04-03', 'Viernes Santo', false)
       ON CONFLICT (fecha) DO NOTHING;`,

      // Mensaje por defecto de "fuera de horario" (solo si sigue el texto
      // anterior, para no pisar una personalización del admin).
      `UPDATE menu_bienvenida
         SET mensaje_fin_semana = '¡Gracias por escribir a Sumichem, {nombre}! Nuestro horario de atención es de lunes a viernes de 8:00 a.m. a 5:00 p.m. Un asesor se comunicará contigo el próximo día hábil en horario laboral.'
       WHERE mensaje_fin_semana = '¡Gracias por escribir a Sumichem! Nuestro horario de atención es de lunes a viernes de 8:00 a.m. a 5:00 p.m. En cuanto abramos, un asesor continuará atendiéndote.';`,
    ];

    for (const sql of sqls) {
      await queryRunner.query(sql);
    }

    // Backfill de leads activos: recalcula el vencimiento con horas laborales.
    const feriados: Array<{ fecha: string | Date; recurrente_anual: boolean }> =
      await queryRunner.query(
        `SELECT fecha, recurrente_anual FROM dias_no_laborables`,
      );

    const exactas = new Set<string>();
    const recurrentes = new Set<string>();
    for (const f of feriados) {
      const texto =
        typeof f.fecha === 'string'
          ? f.fecha.slice(0, 10)
          : new Date(f.fecha).toISOString().slice(0, 10);
      if (f.recurrente_anual) recurrentes.add(texto.slice(5));
      else exactas.add(texto);
    }

    const leads: Array<{ id: string; asignado_en: string | Date }> =
      await queryRunner.query(
        `SELECT id, asignado_en FROM leads
         WHERE sla_vence_en IS NULL
           AND asignado_en IS NOT NULL
           AND estado IN ('asignado', 'reasignado')`,
      );

    for (const lead of leads) {
      const desde =
        lead.asignado_en instanceof Date
          ? lead.asignado_en
          : new Date(lead.asignado_en);
      if (Number.isNaN(desde.getTime())) continue;
      const vence = calcularVencimientoSLA(desde, { exactas, recurrentes });
      await queryRunner.query(
        `UPDATE leads SET sla_vence_en = $1 WHERE id = $2`,
        [vence, lead.id],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_leads_sla_vence_en`);
    await queryRunner.query(
      `ALTER TABLE "leads" DROP COLUMN IF EXISTS "sla_vence_en"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_dias_no_laborables_recurrente`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "dias_no_laborables"`);
  }
}
