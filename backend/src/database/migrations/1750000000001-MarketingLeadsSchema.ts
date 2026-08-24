import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migración Marketing/Leads (Fase 1): crea el schema de las 6 tablas nuevas del
 * feature de marketing (zonas, vendedor_zona, leads, reasignaciones,
 * conversaciones, mensajes) de forma IDEMPOTENTE (IF NOT EXISTS / DO blocks).
 *
 * - NO editar el baseline (1750000000000-BaselineSchema.ts): este archivo es
 *   una migración adicional para las tablas del feature Marketing/Leads.
 * - En una DB existente es no-op y solo registra la migración; en una DB nueva
 *   crea enums, tablas e índices.
 */
export class MarketingLeadsSchema1750000000001 implements MigrationInterface {
  name = 'MarketingLeadsSchema1750000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const sqls: string[] = [
      // ===== Tipos enum =====
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leads_origen_enum') THEN
           CREATE TYPE leads_origen_enum AS ENUM ('instagram', 'web');
         END IF;
       END $$;`,
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leads_tipo_web_enum') THEN
           CREATE TYPE leads_tipo_web_enum AS ENUM ('cotizacion', 'informacion', 'soporte');
         END IF;
       END $$;`,
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leads_canal_entrada_enum') THEN
           CREATE TYPE leads_canal_entrada_enum AS ENUM ('instagram_boton', 'web_formulario');
         END IF;
       END $$;`,
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leads_estado_enum') THEN
           CREATE TYPE leads_estado_enum AS ENUM ('nuevo', 'asignado', 'contactado', 'calificado', 'convertido', 'perdido', 'reasignado');
         END IF;
       END $$;`,
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reasignaciones_motivo_enum') THEN
           CREATE TYPE reasignaciones_motivo_enum AS ENUM ('sla_vencido', 'manual_admin', 'vendedor_inactivo', 'sin_vendedor_zona');
         END IF;
       END $$;`,
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'conversaciones_estado_enum') THEN
           CREATE TYPE conversaciones_estado_enum AS ENUM ('abierta', 'cerrada', 'transferida');
         END IF;
       END $$;`,
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'conversaciones_canal_enum') THEN
           CREATE TYPE conversaciones_canal_enum AS ENUM ('whatsapp', 'instagram', 'web_chat');
         END IF;
       END $$;`,
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mensajes_remitente_tipo_enum') THEN
           CREATE TYPE mensajes_remitente_tipo_enum AS ENUM ('vendedor', 'lead', 'sistema');
         END IF;
       END $$;`,
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mensajes_tipo_enum') THEN
           CREATE TYPE mensajes_tipo_enum AS ENUM ('texto', 'imagen', 'documento', 'ubicacion', 'plantilla');
         END IF;
       END $$;`,

      // ===== Tabla zonas =====
      `CREATE TABLE IF NOT EXISTS zonas (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        nombre varchar(100) NOT NULL UNIQUE,
        descripcion text NULL,
        activa boolean NOT NULL DEFAULT true,
        fecha_creacion timestamptz NOT NULL DEFAULT now(),
        fecha_actualizacion timestamptz NOT NULL DEFAULT now()
      );`,

      // ===== Tabla vendedor_zona (many-to-many vendedor <-> zona) =====
      `CREATE TABLE IF NOT EXISTS vendedor_zona (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        vendedor_id uuid NOT NULL REFERENCES vendedores(id) ON DELETE CASCADE,
        zona_id uuid NOT NULL REFERENCES zonas(id) ON DELETE CASCADE,
        fecha_asignacion timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_vendedor_zona UNIQUE (vendedor_id, zona_id)
      );`,

      // ===== Tabla leads =====
      `CREATE TABLE IF NOT EXISTS leads (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        origen leads_origen_enum NOT NULL,
        tipo_web leads_tipo_web_enum NULL,
        canal_entrada leads_canal_entrada_enum NOT NULL,
        zona_id uuid NULL REFERENCES zonas(id) ON DELETE SET NULL,
        estado leads_estado_enum NOT NULL DEFAULT 'nuevo',
        vendedor_asignado_id uuid NULL REFERENCES vendedores(id) ON DELETE SET NULL,
        cliente_id uuid NULL REFERENCES clientes(id) ON DELETE SET NULL,
        datos_contacto jsonb NOT NULL,
        metadata jsonb NULL,
        asignado_en timestamptz NULL,
        ultima_actividad_en timestamptz NULL,
        fecha_creacion timestamptz NOT NULL DEFAULT now(),
        fecha_actualizacion timestamptz NOT NULL DEFAULT now()
      );`,

      // ===== Tabla reasignaciones =====
      `CREATE TABLE IF NOT EXISTS reasignaciones (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        vendedor_anterior_id uuid NULL REFERENCES vendedores(id) ON DELETE SET NULL,
        vendedor_nuevo_id uuid NULL REFERENCES vendedores(id) ON DELETE SET NULL,
        motivo reasignaciones_motivo_enum NOT NULL,
        fecha timestamptz NOT NULL DEFAULT now()
      );`,

      // ===== Tabla conversaciones =====
      `CREATE TABLE IF NOT EXISTS conversaciones (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        vendedor_id uuid NOT NULL REFERENCES vendedores(id) ON DELETE CASCADE,
        estado conversaciones_estado_enum NOT NULL DEFAULT 'abierta',
        canal conversaciones_canal_enum NOT NULL DEFAULT 'whatsapp',
        ultimo_mensaje_en timestamptz NULL,
        fecha_creacion timestamptz NOT NULL DEFAULT now(),
        fecha_actualizacion timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_conversaciones_lead UNIQUE (lead_id)
      );`,

      // ===== Tabla mensajes =====
      `CREATE TABLE IF NOT EXISTS mensajes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        conversacion_id uuid NOT NULL REFERENCES conversaciones(id) ON DELETE CASCADE,
        remitente_tipo mensajes_remitente_tipo_enum NOT NULL,
        remitente_id uuid NOT NULL,
        contenido text NOT NULL,
        tipo mensajes_tipo_enum NOT NULL DEFAULT 'texto',
        metadata jsonb NULL,
        detectado_sin_stock boolean NOT NULL DEFAULT false,
        fecha_creacion timestamptz NOT NULL DEFAULT now()
      );`,

      // ===== Índices =====
      `CREATE INDEX IF NOT EXISTS idx_vendedor_zona_vendedor_id ON vendedor_zona(vendedor_id);`,
      `CREATE INDEX IF NOT EXISTS idx_vendedor_zona_zona_id ON vendedor_zona(zona_id);`,
      `CREATE INDEX IF NOT EXISTS idx_leads_vendedor_asignado_id ON leads(vendedor_asignado_id);`,
      `CREATE INDEX IF NOT EXISTS idx_leads_zona_id ON leads(zona_id);`,
      `CREATE INDEX IF NOT EXISTS idx_leads_estado ON leads(estado);`,
      `CREATE INDEX IF NOT EXISTS idx_leads_origen ON leads(origen);`,
      `CREATE INDEX IF NOT EXISTS idx_leads_fecha_creacion ON leads(fecha_creacion);`,
      `CREATE INDEX IF NOT EXISTS idx_reasignaciones_lead_id ON reasignaciones(lead_id);`,
      `CREATE INDEX IF NOT EXISTS idx_reasignaciones_vendedor_anterior_id ON reasignaciones(vendedor_anterior_id);`,
      `CREATE INDEX IF NOT EXISTS idx_reasignaciones_vendedor_nuevo_id ON reasignaciones(vendedor_nuevo_id);`,
      `CREATE INDEX IF NOT EXISTS idx_reasignaciones_motivo ON reasignaciones(motivo);`,
      `CREATE INDEX IF NOT EXISTS idx_reasignaciones_fecha ON reasignaciones(fecha);`,
      `CREATE INDEX IF NOT EXISTS idx_conversaciones_vendedor_id ON conversaciones(vendedor_id);`,
      `CREATE INDEX IF NOT EXISTS idx_conversaciones_estado ON conversaciones(estado);`,
      `CREATE INDEX IF NOT EXISTS idx_conversaciones_ultimo_mensaje_en ON conversaciones(ultimo_mensaje_en);`,
      `CREATE INDEX IF NOT EXISTS idx_mensajes_conversacion_id ON mensajes(conversacion_id);`,
      `CREATE INDEX IF NOT EXISTS idx_mensajes_remitente_tipo ON mensajes(remitente_tipo);`,
      `CREATE INDEX IF NOT EXISTS idx_mensajes_fecha_creacion ON mensajes(fecha_creacion);`,
    ];

    for (const sql of sqls) {
      await queryRunner.query(sql);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const sqls: string[] = [
      `DROP TABLE IF EXISTS mensajes;`,
      `DROP TABLE IF EXISTS conversaciones;`,
      `DROP TABLE IF EXISTS reasignaciones;`,
      `DROP TABLE IF EXISTS leads;`,
      `DROP TABLE IF EXISTS vendedor_zona;`,
      `DROP TABLE IF EXISTS zonas;`,
      `DROP TYPE IF EXISTS mensajes_tipo_enum;`,
      `DROP TYPE IF EXISTS mensajes_remitente_tipo_enum;`,
      `DROP TYPE IF EXISTS conversaciones_canal_enum;`,
      `DROP TYPE IF EXISTS conversaciones_estado_enum;`,
      `DROP TYPE IF EXISTS reasignaciones_motivo_enum;`,
      `DROP TYPE IF EXISTS leads_estado_enum;`,
      `DROP TYPE IF EXISTS leads_canal_entrada_enum;`,
      `DROP TYPE IF EXISTS leads_tipo_web_enum;`,
      `DROP TYPE IF EXISTS leads_origen_enum;`,
    ];

    for (const sql of sqls) {
      await queryRunner.query(sql);
    }
  }
}