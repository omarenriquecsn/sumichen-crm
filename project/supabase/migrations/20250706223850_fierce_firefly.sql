/*
  # Datos de ejemplo para el CRM

  1. Datos de muestra
    - Vendedores de ejemplo
    - Clientes de prueba
    - Actividades y reuniones
    - Tickets y pedidos de ejemplo

  2. Configuración inicial
    - Metas mensuales
    - Oportunidades en el pipeline
*/

-- Insertar vendedores de ejemplo (estos se crearán cuando los usuarios se registren)
-- Los datos se insertarán automáticamente cuando un usuario se registre a través de Firebase Auth

-- Función para crear perfil de vendedor automáticamente
-- Punto 5: el rol SIEMPRE es 'vendedor' (el rol auto-reportado en
-- raw_user_meta_data no es de confiar). Promover a admin lo hace un admin
-- existente desde la app (PUT /usuarios/:id).
-- Punto 10: también se graba supabase_id = NEW.id (el backend busca el perfil
-- por esa columna en jwtHandler y en GET /usuarios/:id).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.vendedores (id, supabase_id, nombre, apellido, rol)
  VALUES (
    NEW.id,
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', 'Usuario'),
    COALESCE(NEW.raw_user_meta_data->>'apellido', 'Nuevo'),
    'vendedor'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil automáticamente cuando se registra un usuario
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insertar algunos clientes de ejemplo para demostración
-- Nota: Estos se insertarán con un vendedor específico una vez que tengas usuarios reales

-- Función para insertar datos de ejemplo (ejecutar después de tener usuarios)
CREATE OR REPLACE FUNCTION insert_sample_data( vendedor_uuid uuid)
RETURNS void AS $$
BEGIN
  -- Insertar clientes de ejemplo
  INSERT INTO clientes (vendedor_id, nombre, apellido, email, telefono, empresa, cargo, estado, etapa_venta, valor_potencial, probabilidad) VALUES
  (vendedor_uuid, 'Ana', 'García', 'ana.garcia@techcorp.com', '+52 555 123 4567', 'TechCorp S.A.', 'Directora de TI', 'cliente', 'cerrado', 45000, 100),
  (vendedor_uuid, 'Carlos', 'López', 'carlos.lopez@innovacion.com', '+52 555 987 6543', 'Innovación Digital', 'Gerente de Compras', 'prospecto', 'propuesta', 32000, 70),
  (vendedor_uuid, 'María', 'Rodríguez', 'maria.rodriguez@soluciones.com', '+52 555 456 7890', 'Soluciones Empresariales', 'CEO', 'cliente', 'negociacion', 78000, 85),
  (vendedor_uuid, 'Fernando', 'López', 'fernando.lopez@globaltech.com', '+52 555 321 9876', 'Global Tech', 'Director de Operaciones', 'cliente', 'cerrado', 52000, 100);

  -- Insertar actividades de ejemplo
  INSERT INTO actividades (cliente_id, vendedor_id, tipo, titulo, descripcion, completado) 
  SELECT 
    c.id,
    vendedor_uuid,
    'reunion',
    'Reunión inicial con ' || c.nombre,
    'Primera reunión para entender necesidades del cliente',
    true
  FROM clientes c WHERE c.vendedor_id = vendedor_uuid LIMIT 2;

  -- Insertar reuniones de ejemplo
  INSERT INTO reuniones (cliente_id, vendedor_id, titulo, descripcion, fecha_inicio, fecha_fin, ubicacion, tipo, estado)
  SELECT 
    c.id,
    vendedor_uuid,
    'Demo de producto - ' || c.empresa,
    'Presentación de la plataforma',
    now() + interval '1 day',
    now() + interval '1 day' + interval '1 hour',
    'Oficina ' || c.empresa,
    'presencial',
    'programada'
  FROM clientes c WHERE c.vendedor_id = vendedor_uuid LIMIT 1;

  -- Insertar tickets de ejemplo
  INSERT INTO tickets (cliente_id, vendedor_id, titulo, descripcion, estado, prioridad, categoria)
  SELECT 
    c.id,
    vendedor_uuid,
    'Consulta sobre facturación',
    'El cliente tiene dudas sobre el proceso de facturación',
    'abierto',
    'media',
    'facturacion'
  FROM clientes c WHERE c.vendedor_id = vendedor_uuid LIMIT 1;

  -- Insertar pedidos de ejemplo
  INSERT INTO pedidos (cliente_id, vendedor_id, estado, subtotal, total)
  SELECT 
    c.id,
    vendedor_uuid,
    'aprobado',
    c.valor_potencial * 0.8,
    c.valor_potencial
  FROM clientes c WHERE c.vendedor_id = vendedor_uuid AND c.estado = 'cliente' LIMIT 1;

  -- Insertar oportunidades para el pipeline
  INSERT INTO oportunidades (cliente_id, vendedor_id, titulo, descripcion, valor, probabilidad, etapa)
  SELECT 
    c.id,
    vendedor_uuid,
    'Oportunidad - ' || c.empresa,
    'Venta de solución completa',
    c.valor_potencial,
    c.probabilidad,
    c.etapa_venta
  FROM clientes c WHERE c.vendedor_id = vendedor_uuid;

  -- Insertar meta mensual
  INSERT INTO metas (vendedor_id, mes, ano, objetivo_ventas, objetivo_clientes)
  VALUES (vendedor_uuid, EXTRACT(MONTH FROM now()), EXTRACT(YEAR FROM now()), 100000, 20);

END;
$$ LANGUAGE plpgsql;