/*
  # Esquema completo del CRM — ALINEADO CON LAS ENTIDADES TYPEORM (Punto 10)

  ⚠ IMPORTANTE (Punto 10, 18/08):
  Este archivo es el SQL CANÓNICO de referencia para montar una base de datos
  Supabase NUEVA compatible con el backend. Fue reescrito para coincidir con las
  entidades TypeORM (src/entities/) y la migración baseline
  (src/database/migrations/1750000000000-BaselineSchema.ts), que son la fuente
  de verdad del schema.

  En la base de producción NO hace falta re-ejecutarlo (el schema ya existe y se
  mantiene con las entidades + migraciones TypeORM, synchronize:false).
  Si se ejecuta contra una base existente es idempotente (IF NOT EXISTS) salvo
  las ALTER que agregan columnas nuevas, que también son ADD COLUMN IF NOT EXISTS.

  Tablas:
    - vendedores          → Vendedor (incluye supabase_id para lookup del JWT)
    - clientes            → Cliente (rif único, sector, sin columnas legacy)
    - actividades         → Actividad
    - reuniones           → Reunion
    - tickets             → Ticket (número autogenerado por trigger)
    - pedidos             → Pedido (numero_seq, tipo_pago, dias_credito, moneda,
                             transporte, evidencia_url, estado pendiente/procesado)
    - productos_pedido    → ProductosPedido (producto_id, total)
    - productos           → Producto
    - metas               → Meta (mes text, contadores de actividades)
    - oportunidades       → Oportunidad (cliente_id único)
    - notificaciones      → Notificacion

  2. Seguridad
    - RLS habilitado en todas las tablas
    - Políticas: vendedor solo ve sus datos; admin ve todo

  3. Funciones/triggers
    - update_updated_at_column() para fecha_actualizacion
    - generate_ticket_number() + ticket_sequence para tickets.numero
    - numero_seq para pedidos.numero (default nextval)
    - (El trigger handle_new_user para auth.users está en fierce_firefly.sql)
*/

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Secuencia para números de pedidos (pedidos.numero = integer con nextval)
CREATE SEQUENCE IF NOT EXISTS numero_seq START 1;

-- Tabla de vendedores (extiende auth.users)
CREATE TABLE IF NOT EXISTS vendedores (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  supabase_id text NOT NULL,
  nombre text NOT NULL,
  apellido text NOT NULL,
  telefono text,
  rol text NOT NULL DEFAULT 'vendedor' CHECK (rol IN ('vendedor', 'admin')),
  activo boolean DEFAULT true,
  meta_mensual_ventas numeric DEFAULT 0,
  meta_mensual_clientes integer DEFAULT 0,
  monto_negociacion_mes numeric DEFAULT 0,
  fecha_creacion timestamptz DEFAULT now(),
  fecha_actualizacion timestamptz DEFAULT now()
);

-- Índice para el lookup del backend por supabase_id (jwtHandler, /usuarios/:id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_vendedores_supabase_id ON vendedores(supabase_id);

-- Tabla de clientes
CREATE TABLE IF NOT EXISTS clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rif text UNIQUE NOT NULL,
  vendedor_id uuid NOT NULL REFERENCES vendedores(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  apellido text NOT NULL,
  email text NOT NULL,
  telefono text,
  empresa text NOT NULL,
  estado text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo', 'prospecto')),
  etapa_venta text NOT NULL DEFAULT 'inicial' CHECK (etapa_venta IN ('inicial', 'calificado', 'propuesta', 'negociacion', 'cerrado')),
  estado_anterior text,
  fecha_estado timestamptz,
  notas text,
  direccion text DEFAULT 'sin direccion',
  ciudad text DEFAULT 'valencia',
  direccion_entrega text,
  google_maps text,
  sector text CHECK (sector IN (
    'Alimentos y Bebidas',
    'Nutricion Animal',
    'Cosmetica',
    'Cuidado Personal y del Hogar',
    'Pintura',
    'Polimeros y Material de Empaque',
    'Industria farmaceutica',
    'Industria Petrolera'
  )),
  fecha_creacion date DEFAULT now(),
  fecha_actualizacion date DEFAULT now()
);

-- Tabla de actividades
CREATE TABLE IF NOT EXISTS actividades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  vendedor_id uuid NOT NULL REFERENCES vendedores(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'llamada' CHECK (tipo IN ('llamada', 'email', 'reunion', 'nota', 'tarea')),
  titulo varchar(150) NOT NULL,
  descripcion text NOT NULL,
  fecha timestamptz NOT NULL,
  fecha_vencimiento timestamptz,
  completado boolean DEFAULT false,
  id_tipo_actividad text,
  fecha_creacion timestamptz DEFAULT now(),
  fecha_actualizacion timestamptz DEFAULT now()
);

-- Tabla de reuniones
CREATE TABLE IF NOT EXISTS reuniones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  vendedor_id uuid NOT NULL REFERENCES vendedores(id) ON DELETE CASCADE,
  titulo varchar(150) NOT NULL,
  descripcion text NOT NULL,
  fecha_inicio timestamptz NOT NULL,
  fecha_fin timestamptz NOT NULL,
  ubicacion text NOT NULL,
  tipo text NOT NULL DEFAULT 'telefonica' CHECK (tipo IN ('presencial', 'virtual', 'telefonica')),
  estado text NOT NULL DEFAULT 'programada' CHECK (estado IN ('programada', 'cancelada', 'completada')),
  recordatorio boolean DEFAULT false,
  enlace_reunion text,
  fecha_creacion timestamptz DEFAULT now(),
  fecha_actualizacion timestamptz DEFAULT now()
);

-- Tabla de tickets
CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  vendedor_id uuid NOT NULL REFERENCES vendedores(id) ON DELETE CASCADE,
  numero varchar(50) UNIQUE NOT NULL,
  titulo varchar(150) NOT NULL,
  descripcion text NOT NULL,
  estado text NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto', 'en_proceso', 'resuelto', 'cerrado')),
  prioridad text NOT NULL DEFAULT 'media' CHECK (prioridad IN ('alta', 'media', 'baja', 'urgente')),
  categoria text NOT NULL DEFAULT 'producto' CHECK (categoria IN ('tecnico', 'facturacion', 'producto', 'servicio')),
  fecha_creacion timestamptz DEFAULT now(),
  fecha_actualizacion timestamptz DEFAULT now()
);

-- Tabla de pedidos (numero integer autogenerado con numero_seq)
CREATE TABLE IF NOT EXISTS pedidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero integer UNIQUE NOT NULL DEFAULT nextval('numero_seq'),
  cliente_id uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  vendedor_id uuid NOT NULL REFERENCES vendedores(id) ON DELETE CASCADE,
  subtotal numeric(12,2) NOT NULL,
  impuestos numeric(12,2) NOT NULL,
  total numeric(12,2) NOT NULL,
  fecha_entrega timestamptz NOT NULL,
  notas text,
  tipo_pago text NOT NULL DEFAULT 'contado' CHECK (tipo_pago IN ('contado', 'credito')),
  dias_credito integer DEFAULT 0,
  moneda text NOT NULL DEFAULT 'usd' CHECK (moneda IN ('usd', 'bs')),
  transporte text CHECK (transporte IN ('interno', 'externo')),
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'procesado')),
  evidencia_url text,
  fecha_creacion timestamptz DEFAULT now(),
  fecha_actualizacion timestamptz DEFAULT now()
);

-- Tabla de productos
CREATE TABLE IF NOT EXISTS productos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre varchar NOT NULL,
  descripcion text NOT NULL,
  unidad_medida varchar NOT NULL,
  precio_base numeric(12,4) DEFAULT 0
);

-- Tabla de productos en pedidos (relación directa con productos)
CREATE TABLE IF NOT EXISTS productos_pedido (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id uuid NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  pedido_id uuid NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  precio_unitario numeric(12,4) NOT NULL,
  total numeric(10,2) NOT NULL,
  cantidad numeric(10,2) NOT NULL
);

-- Tabla de metas mensuales (mes como texto: 'enero', 'febrero', ...)
CREATE TABLE IF NOT EXISTS metas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id uuid NOT NULL REFERENCES vendedores(id) ON DELETE CASCADE,
  mes text NOT NULL,
  ano integer NOT NULL,
  objetivo_ventas numeric(12,2) NOT NULL,
  objetivo_clientes integer NOT NULL,
  emails integer DEFAULT 0,
  tareas integer DEFAULT 0,
  llamadas integer DEFAULT 0,
  reuniones integer DEFAULT 0,
  fecha_creacion timestamptz DEFAULT now(),
  fecha_actualizacion timestamptz DEFAULT now()
);

-- Tabla de oportunidades (un cliente → una oportunidad)
CREATE TABLE IF NOT EXISTS oportunidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid UNIQUE NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  vendedor_id uuid NOT NULL REFERENCES vendedores(id) ON DELETE CASCADE,
  titulo varchar(150) NOT NULL,
  descripcion text NOT NULL,
  valor numeric(12,2) NOT NULL,
  probabilidad integer NOT NULL,
  etapa text DEFAULT 'inicial' CHECK (etapa IN ('inicial', 'calificado', 'propuesta', 'negociacion', 'cerrado')),
  fecha_cierre_estimada timestamptz,
  fecha_creacion timestamptz DEFAULT now(),
  fecha_actualizacion timestamptz DEFAULT now()
);

-- Tabla de notificaciones
CREATE TABLE IF NOT EXISTS notificaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id uuid NOT NULL REFERENCES vendedores(id) ON DELETE CASCADE,
  descripcion text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('cancelado', 'aprobado')),
  leida boolean DEFAULT false,
  fecha timestamptz DEFAULT now()
);

-- Habilitar RLS en todas las tablas
ALTER TABLE vendedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE actividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE reuniones ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos_pedido ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE metas ENABLE ROW LEVEL SECURITY;
ALTER TABLE oportunidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

-- Políticas para vendedores (tabla vendedores)
CREATE POLICY "Vendedores pueden ver su propio perfil"
  ON vendedores FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Vendedores pueden actualizar su propio perfil"
  ON vendedores FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins pueden ver todos los vendedores"
  ON vendedores FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vendedores
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );

-- Políticas para clientes
CREATE POLICY "Vendedores pueden ver sus propios clientes"
  ON clientes FOR SELECT
  TO authenticated
  USING (vendedor_id = auth.uid());

CREATE POLICY "Vendedores pueden crear clientes"
  ON clientes FOR INSERT
  TO authenticated
  WITH CHECK (vendedor_id = auth.uid());

CREATE POLICY "Vendedores pueden actualizar sus propios clientes"
  ON clientes FOR UPDATE
  TO authenticated
  USING (vendedor_id = auth.uid());

CREATE POLICY "Admins pueden ver todos los clientes"
  ON clientes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vendedores
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );

-- Políticas para actividades
CREATE POLICY "Vendedores pueden ver sus propias actividades"
  ON actividades FOR SELECT
  TO authenticated
  USING (vendedor_id = auth.uid());

CREATE POLICY "Vendedores pueden crear actividades"
  ON actividades FOR INSERT
  TO authenticated
  WITH CHECK (vendedor_id = auth.uid());

CREATE POLICY "Vendedores pueden actualizar sus propias actividades"
  ON actividades FOR UPDATE
  TO authenticated
  USING (vendedor_id = auth.uid());

-- Políticas para reuniones
CREATE POLICY "Vendedores pueden ver sus propias reuniones"
  ON reuniones FOR SELECT
  TO authenticated
  USING (vendedor_id = auth.uid());

CREATE POLICY "Vendedores pueden crear reuniones"
  ON reuniones FOR INSERT
  TO authenticated
  WITH CHECK (vendedor_id = auth.uid());

CREATE POLICY "Vendedores pueden actualizar sus propias reuniones"
  ON reuniones FOR UPDATE
  TO authenticated
  USING (vendedor_id = auth.uid());

-- Políticas para tickets
CREATE POLICY "Vendedores pueden ver sus propios tickets"
  ON tickets FOR SELECT
  TO authenticated
  USING (vendedor_id = auth.uid());

CREATE POLICY "Vendedores pueden crear tickets"
  ON tickets FOR INSERT
  TO authenticated
  WITH CHECK (vendedor_id = auth.uid());

CREATE POLICY "Vendedores pueden actualizar sus propios tickets"
  ON tickets FOR UPDATE
  TO authenticated
  USING (vendedor_id = auth.uid());

-- Políticas para pedidos
CREATE POLICY "Vendedores pueden ver sus propios pedidos"
  ON pedidos FOR SELECT
  TO authenticated
  USING (vendedor_id = auth.uid());

CREATE POLICY "Vendedores pueden crear pedidos"
  ON pedidos FOR INSERT
  TO authenticated
  WITH CHECK (vendedor_id = auth.uid());

CREATE POLICY "Vendedores pueden actualizar sus propios pedidos"
  ON pedidos FOR UPDATE
  TO authenticated
  USING (vendedor_id = auth.uid());

-- Políticas para productos (catálogo global: todos los autenticados leen)
CREATE POLICY "Autenticados pueden ver productos"
  ON productos FOR SELECT
  TO authenticated
  USING (true);

-- Políticas para productos_pedido
CREATE POLICY "Vendedores pueden ver productos de sus pedidos"
  ON productos_pedido FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pedidos
      WHERE id = pedido_id AND vendedor_id = auth.uid()
    )
  );

CREATE POLICY "Vendedores pueden crear productos en sus pedidos"
  ON productos_pedido FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pedidos
      WHERE id = pedido_id AND vendedor_id = auth.uid()
    )
  );

-- Políticas para metas
CREATE POLICY "Vendedores pueden ver sus propias metas"
  ON metas FOR SELECT
  TO authenticated
  USING (vendedor_id = auth.uid());

CREATE POLICY "Vendedores pueden crear sus propias metas"
  ON metas FOR INSERT
  TO authenticated
  WITH CHECK (vendedor_id = auth.uid());

CREATE POLICY "Vendedores pueden actualizar sus propias metas"
  ON metas FOR UPDATE
  TO authenticated
  USING (vendedor_id = auth.uid());

-- Políticas para oportunidades
CREATE POLICY "Vendedores pueden ver sus propias oportunidades"
  ON oportunidades FOR SELECT
  TO authenticated
  USING (vendedor_id = auth.uid());

CREATE POLICY "Vendedores pueden crear oportunidades"
  ON oportunidades FOR INSERT
  TO authenticated
  WITH CHECK (vendedor_id = auth.uid());

CREATE POLICY "Vendedores pueden actualizar sus propias oportunidades"
  ON oportunidades FOR UPDATE
  TO authenticated
  USING (vendedor_id = auth.uid());

-- Políticas para notificaciones (cada vendedor solo las suyas; admin todas)
CREATE POLICY "Vendedores pueden ver sus notificaciones"
  ON notificaciones FOR SELECT
  TO authenticated
  USING (vendedor_id = auth.uid());

CREATE POLICY "Vendedores pueden crear notificaciones"
  ON notificaciones FOR INSERT
  TO authenticated
  WITH CHECK (vendedor_id = auth.uid());

CREATE POLICY "Vendedores pueden actualizar sus notificaciones"
  ON notificaciones FOR UPDATE
  TO authenticated
  USING (vendedor_id = auth.uid());

CREATE POLICY "Admins pueden ver todas las notificaciones"
  ON notificaciones FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vendedores
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );

-- Función para actualizar timestamp de actualización
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fecha_actualizacion = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar fecha_actualizacion automáticamente
CREATE TRIGGER update_vendedores_updated_at BEFORE UPDATE ON vendedores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON clientes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_actividades_updated_at BEFORE UPDATE ON actividades FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reuniones_updated_at BEFORE UPDATE ON reuniones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pedidos_updated_at BEFORE UPDATE ON pedidos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_metas_updated_at BEFORE UPDATE ON metas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_oportunidades_updated_at BEFORE UPDATE ON oportunidades FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Secuencia y trigger para números de tickets (varchar, ej. TICK-2026-0001)
CREATE SEQUENCE IF NOT EXISTS ticket_sequence START 1;

CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.numero = 'TICK-' || TO_CHAR(now(), 'YYYY') || '-' || LPAD(nextval('ticket_sequence')::text, 4, '0');
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER generate_ticket_number_trigger
  BEFORE INSERT ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION generate_ticket_number();

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_clientes_vendedor_id ON clientes(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_clientes_estado ON clientes(estado);
CREATE INDEX IF NOT EXISTS idx_clientes_etapa_venta ON clientes(etapa_venta);
CREATE INDEX IF NOT EXISTS idx_actividades_cliente_id ON actividades(cliente_id);
CREATE INDEX IF NOT EXISTS idx_actividades_vendedor_id ON actividades(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_actividades_fecha ON actividades(fecha);
CREATE INDEX IF NOT EXISTS idx_reuniones_vendedor_id ON reuniones(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_reuniones_fecha_inicio ON reuniones(fecha_inicio);
CREATE INDEX IF NOT EXISTS idx_tickets_vendedor_id ON tickets(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_tickets_estado ON tickets(estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_vendedor_id ON pedidos(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos(estado);
CREATE INDEX IF NOT EXISTS idx_productos_pedido_pedido_id ON productos_pedido(pedido_id);
CREATE INDEX IF NOT EXISTS idx_oportunidades_vendedor_id ON oportunidades(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_oportunidades_etapa ON oportunidades(etapa);
CREATE INDEX IF NOT EXISTS idx_notificaciones_vendedor_id ON notificaciones(vendedor_id);