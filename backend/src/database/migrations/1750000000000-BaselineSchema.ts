import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migración baseline: crea el schema completo del CRM de forma IDEMPOTENTE
 * (todos los CREATE usan IF NOT EXISTS o bloques protegidos).
 *
 * - En una DB ya existente (creada antes por `synchronize: true`): NO altera nada,
 *   solo registra la migración como aplicada en la tabla `migrations`.
 * - En una DB nueva: crea tablas, tipos enum, secuencias e índices.
 *
 * ⚠ NOTA: el SQL canónico de Supabase (project/supabase/migrations/*.sql) está
 * desactualizado y NO coincide con este schema. Este archivo es la fuente de
 * verdad para el backend (entidades TypeORM).
 */
export class BaselineSchema1750000000000 implements MigrationInterface {
  name = 'BaselineSchema1750000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const sqls: string[] = [
      // ===== Tipos enum (Postgres no soporta CREATE TYPE IF NOT EXISTS; se usa DO block) =====
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vendedores_rol_enum') THEN
           CREATE TYPE vendedores_rol_enum AS ENUM ('vendedor', 'admin');
         END IF;
       END $$;`,
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'clientes_estado_enum') THEN
           CREATE TYPE clientes_estado_enum AS ENUM ('activo', 'inactivo', 'prospecto');
         END IF;
       END $$;`,
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'clientes_etapa_venta_enum') THEN
           CREATE TYPE clientes_etapa_venta_enum AS ENUM ('inicial', 'calificado', 'propuesta', 'negociacion', 'cerrado');
         END IF;
       END $$;`,
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'clientes_sector_enum') THEN
           CREATE TYPE clientes_sector_enum AS ENUM (
             'Alimentos y Bebidas', 'Nutricion Animal', 'Cosmetica',
             'Cuidado Personal y del Hogar', 'Pintura',
             'Polimeros y Material de Empaque', 'Industria farmaceutica',
             'Industria Petrolera'
           );
         END IF;
       END $$;`,
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'actividades_tipo_enum') THEN
           CREATE TYPE actividades_tipo_enum AS ENUM ('llamada', 'email', 'reunion', 'nota', 'tarea');
         END IF;
       END $$;`,
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reuniones_tipo_enum') THEN
           CREATE TYPE reuniones_tipo_enum AS ENUM ('presencial', 'virtual', 'telefonica');
         END IF;
       END $$;`,
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reuniones_estado_enum') THEN
           CREATE TYPE reuniones_estado_enum AS ENUM ('programada', 'cancelada', 'completada');
         END IF;
       END $$;`,
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tickets_estado_enum') THEN
           CREATE TYPE tickets_estado_enum AS ENUM ('abierto', 'en_proceso', 'resuelto', 'cerrado');
         END IF;
       END $$;`,
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tickets_prioridad_enum') THEN
           CREATE TYPE tickets_prioridad_enum AS ENUM ('alta', 'media', 'baja', 'urgente');
         END IF;
       END $$;`,
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tickets_categoria_enum') THEN
           CREATE TYPE tickets_categoria_enum AS ENUM ('tecnico', 'facturacion', 'producto', 'servicio');
         END IF;
       END $$;`,
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pedidos_tipo_pago_enum') THEN
           CREATE TYPE pedidos_tipo_pago_enum AS ENUM ('contado', 'credito');
         END IF;
       END $$;`,
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pedidos_moneda_enum') THEN
           CREATE TYPE pedidos_moneda_enum AS ENUM ('usd', 'bs');
         END IF;
       END $$;`,
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pedidos_transporte_enum') THEN
           CREATE TYPE pedidos_transporte_enum AS ENUM ('interno', 'externo');
         END IF;
       END $$;`,
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pedidos_estado_enum') THEN
           CREATE TYPE pedidos_estado_enum AS ENUM ('pendiente', 'procesado');
         END IF;
       END $$;`,
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'oportunidades_etapa_enum') THEN
           CREATE TYPE oportunidades_etapa_enum AS ENUM ('inicial', 'calificado', 'propuesta', 'negociacion', 'cerrado');
         END IF;
       END $$;`,
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notificaciones_tipo_enum') THEN
           CREATE TYPE notificaciones_tipo_enum AS ENUM ('cancelado', 'aprobado');
         END IF;
       END $$;`,

      // ===== Secuencia de números de pedidos (se crea aquí porque TypeORM no la crea con synchronize) =====
      `CREATE SEQUENCE IF NOT EXISTS numero_seq START 1;`,

      // ===== Tabla vendedores =====
      `CREATE TABLE IF NOT EXISTS vendedores (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        supabase_id varchar NOT NULL,
        nombre varchar NOT NULL,
        apellido varchar NOT NULL,
        telefono varchar NULL,
        rol vendedores_rol_enum NOT NULL DEFAULT 'vendedor',
        activo boolean NOT NULL DEFAULT true,
        meta_mensual_ventas numeric NULL DEFAULT 0,
        meta_mensual_clientes integer NULL DEFAULT 0,
        monto_negociacion_mes numeric NULL DEFAULT 0,
        fecha_creacion timestamptz NOT NULL DEFAULT now(),
        fecha_actualizacion timestamptz NOT NULL DEFAULT now()
      );`,

      // ===== Tabla clientes =====
      `CREATE TABLE IF NOT EXISTS clientes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        rif varchar NOT NULL UNIQUE,
        vendedor_id uuid NOT NULL REFERENCES vendedores(id),
        nombre varchar NOT NULL,
        apellido varchar NOT NULL,
        email varchar NOT NULL,
        telefono varchar NOT NULL,
        empresa varchar NOT NULL,
        estado clientes_estado_enum NOT NULL DEFAULT 'activo',
        etapa_venta clientes_etapa_venta_enum NOT NULL DEFAULT 'inicial',
        estado_anterior text NULL,
        fecha_estado timestamptz NULL,
        notas text NULL,
        direccion varchar NULL DEFAULT 'sin direccion',
        ciudad varchar NULL DEFAULT 'valencia',
        direccion_entrega varchar NULL,
        google_maps varchar NULL,
        fecha_creacion date NULL DEFAULT now(),
        fecha_actualizacion date NULL DEFAULT now(),
        sector clientes_sector_enum NULL
      );`,

      // ===== Tabla actividades =====
      `CREATE TABLE IF NOT EXISTS actividades (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        cliente_id uuid NOT NULL REFERENCES clientes(id),
        vendedor_id uuid NOT NULL REFERENCES vendedores(id),
        tipo actividades_tipo_enum NOT NULL DEFAULT 'llamada',
        titulo varchar(150) NOT NULL,
        descripcion varchar NOT NULL,
        fecha timestamptz NOT NULL,
        fecha_vencimiento timestamptz NULL,
        completado boolean NOT NULL DEFAULT false,
        id_tipo_actividad varchar NULL,
        fecha_creacion timestamptz NOT NULL DEFAULT now(),
        fecha_actualizacion timestamptz NOT NULL DEFAULT now()
      );`,

      // ===== Tabla reuniones =====
      `CREATE TABLE IF NOT EXISTS reuniones (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        cliente_id uuid NOT NULL REFERENCES clientes(id),
        vendedor_id uuid NOT NULL REFERENCES vendedores(id),
        titulo varchar(150) NOT NULL,
        descripcion varchar NOT NULL,
        fecha_inicio timestamptz NOT NULL,
        fecha_fin timestamptz NOT NULL,
        ubicacion varchar NOT NULL,
        tipo reuniones_tipo_enum NOT NULL DEFAULT 'telefonica',
        estado reuniones_estado_enum NOT NULL DEFAULT 'programada',
        recordatorio boolean NOT NULL DEFAULT false,
        enlace_reunion varchar NULL,
        fecha_creacion timestamptz NOT NULL DEFAULT now(),
        fecha_actualizacion timestamptz NOT NULL DEFAULT now()
      );`,

      // ===== Tabla tickets =====
      `CREATE TABLE IF NOT EXISTS tickets (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        cliente_id uuid NOT NULL REFERENCES clientes(id),
        vendedor_id uuid NOT NULL REFERENCES vendedores(id),
        numero varchar(50) NOT NULL,
        titulo varchar(150) NOT NULL,
        descripcion varchar NOT NULL,
        estado tickets_estado_enum NOT NULL DEFAULT 'abierto',
        prioridad tickets_prioridad_enum NOT NULL DEFAULT 'media',
        categoria tickets_categoria_enum NOT NULL DEFAULT 'producto',
        fecha_creacion timestamptz NOT NULL DEFAULT now(),
        fecha_actualizacion timestamptz NOT NULL DEFAULT now()
      );`,

      // ===== Tabla pedidos =====
      `CREATE TABLE IF NOT EXISTS pedidos (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        numero integer NOT NULL DEFAULT nextval('numero_seq'),
        cliente_id uuid NOT NULL REFERENCES clientes(id),
        vendedor_id uuid NOT NULL REFERENCES vendedores(id),
        subtotal numeric(12,2) NOT NULL,
        impuestos numeric(12,2) NOT NULL,
        total numeric(12,2) NOT NULL,
        fecha_entrega timestamptz NOT NULL,
        notas text NULL,
        tipo_pago pedidos_tipo_pago_enum NOT NULL DEFAULT 'contado',
        dias_credito integer NULL DEFAULT 0,
        moneda pedidos_moneda_enum NOT NULL DEFAULT 'usd',
        transporte pedidos_transporte_enum NULL DEFAULT 'interno',
        fecha_creacion timestamptz NOT NULL DEFAULT now(),
        fecha_actualizacion timestamptz NOT NULL DEFAULT now(),
        evidencia_url text NULL,
        estado pedidos_estado_enum NOT NULL DEFAULT 'pendiente'
      );`,

      // ===== Tabla productos =====
      `CREATE TABLE IF NOT EXISTS productos (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        nombre varchar NOT NULL,
        descripcion varchar NOT NULL,
        unidad_medida varchar NOT NULL,
        precio_base decimal(12,4) NOT NULL DEFAULT 0
      );`,

      // ===== Tabla productos_pedido =====
      `CREATE TABLE IF NOT EXISTS productos_pedido (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        producto_id uuid NOT NULL REFERENCES productos(id),
        precio_unitario decimal(12,4) NOT NULL,
        total decimal(10,2) NOT NULL,
        cantidad decimal(10,2) NOT NULL,
        pedido_id uuid NOT NULL REFERENCES pedidos(id)
      );`,

      // ===== Tabla metas =====
      `CREATE TABLE IF NOT EXISTS metas (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        vendedor_id uuid NOT NULL REFERENCES vendedores(id),
        mes text NOT NULL,
        ano integer NOT NULL,
        objetivo_ventas numeric(12,2) NOT NULL,
        objetivo_clientes integer NOT NULL,
        emails integer NOT NULL DEFAULT 0,
        tareas integer NOT NULL DEFAULT 0,
        llamadas integer NOT NULL DEFAULT 0,
        reuniones integer NOT NULL DEFAULT 0,
        fecha_creacion timestamptz NOT NULL DEFAULT now(),
        fecha_actualizacion timestamptz NOT NULL DEFAULT now()
      );`,

      // ===== Tabla notificaciones =====
      `CREATE TABLE IF NOT EXISTS notificaciones (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        vendedor_id uuid NOT NULL REFERENCES vendedores(id),
        descripcion varchar NOT NULL,
        tipo notificaciones_tipo_enum NOT NULL,
        leida boolean NOT NULL DEFAULT false,
        fecha timestamptz NOT NULL DEFAULT now()
      );`,

      // ===== Tabla oportunidades =====
      `CREATE TABLE IF NOT EXISTS oportunidades (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        cliente_id uuid NOT NULL UNIQUE REFERENCES clientes(id),
        vendedor_id uuid NOT NULL REFERENCES vendedores(id),
        titulo varchar(150) NOT NULL,
        descripcion text NOT NULL,
        valor numeric(12,2) NOT NULL,
        probabilidad integer NOT NULL,
        etapa oportunidades_etapa_enum NULL DEFAULT 'inicial',
        fecha_cierre_estimada timestamptz NULL,
        fecha_creacion timestamptz NOT NULL DEFAULT now(),
        fecha_actualizacion timestamptz NOT NULL DEFAULT now()
      );`,

      // ===== Índices de rendimiento (opcionales, pero útiles en DB nueva) =====
      `CREATE INDEX IF NOT EXISTS idx_clientes_vendedor_id ON clientes(vendedor_id);`,
      `CREATE INDEX IF NOT EXISTS idx_clientes_estado ON clientes(estado);`,
      `CREATE INDEX IF NOT EXISTS idx_actividades_cliente_id ON actividades(cliente_id);`,
      `CREATE INDEX IF NOT EXISTS idx_actividades_vendedor_id ON actividades(vendedor_id);`,
      `CREATE INDEX IF NOT EXISTS idx_reuniones_vendedor_id ON reuniones(vendedor_id);`,
      `CREATE INDEX IF NOT EXISTS idx_tickets_vendedor_id ON tickets(vendedor_id);`,
      `CREATE INDEX IF NOT EXISTS idx_pedidos_vendedor_id ON pedidos(vendedor_id);`,
      `CREATE INDEX IF NOT EXISTS idx_oportunidades_vendedor_id ON oportunidades(vendedor_id);`,
      `CREATE INDEX IF NOT EXISTS idx_metas_vendedor_id ON metas(vendedor_id);`,
      `CREATE INDEX IF NOT EXISTS idx_notificaciones_vendedor_id ON notificaciones(vendedor_id);`,
    ];

    for (const sql of sqls) {
      await queryRunner.query(sql);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revertir: eliminar tablas en orden inverso de dependencias.
    const sqls: string[] = [
      `DROP TABLE IF EXISTS oportunidades;`,
      `DROP TABLE IF EXISTS notificaciones;`,
      `DROP TABLE IF EXISTS metas;`,
      `DROP TABLE IF EXISTS productos_pedido;`,
      `DROP TABLE IF EXISTS pedidos;`,
      `DROP TABLE IF EXISTS productos;`,
      `DROP TABLE IF EXISTS tickets;`,
      `DROP TABLE IF EXISTS reuniones;`,
      `DROP TABLE IF EXISTS actividades;`,
      `DROP TABLE IF EXISTS clientes;`,
      `DROP TABLE IF EXISTS vendedores;`,
      `DROP SEQUENCE IF EXISTS numero_seq;`,
      `DROP TYPE IF EXISTS notificaciones_tipo_enum;`,
      `DROP TYPE IF EXISTS oportunidades_etapa_enum;`,
      `DROP TYPE IF EXISTS pedidos_estado_enum;`,
      `DROP TYPE IF EXISTS pedidos_transporte_enum;`,
      `DROP TYPE IF EXISTS pedidos_moneda_enum;`,
      `DROP TYPE IF EXISTS pedidos_tipo_pago_enum;`,
      `DROP TYPE IF EXISTS tickets_categoria_enum;`,
      `DROP TYPE IF EXISTS tickets_prioridad_enum;`,
      `DROP TYPE IF EXISTS tickets_estado_enum;`,
      `DROP TYPE IF EXISTS reuniones_estado_enum;`,
      `DROP TYPE IF EXISTS reuniones_tipo_enum;`,
      `DROP TYPE IF EXISTS actividades_tipo_enum;`,
      `DROP TYPE IF EXISTS clientes_sector_enum;`,
      `DROP TYPE IF EXISTS clientes_etapa_venta_enum;`,
      `DROP TYPE IF EXISTS clientes_estado_enum;`,
      `DROP TYPE IF EXISTS vendedores_rol_enum;`,
    ];

    for (const sql of sqls) {
      await queryRunner.query(sql);
    }
  }
}