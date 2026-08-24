export interface User {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: "vendedor" | "admin";
  activo: boolean;
  fecha_creacion: Date;
  telefono?: string;
  avatar?: string;
}

export interface Cliente {
  id: string;
  vendedor_id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  empresa?: string;
  estado: Estado;
  etapa_venta: EtapaVenta;
  // rif: number;
  fecha_creacion: Date;
  fecha_actualizacion: Date;
  notas?: string;
  direccion?: string;
  ciudad?: string;
  fecha_estado?: Date;
  estado_anterior?: string;
  rif: string;
  direccion_entrega?: string;
  google_maps?: string;
  sector?: CustomerSector;
}

export type Estado = "prospecto" | "activo" | "inactivo";

export type EtapaVenta =
  | "inicial"
  | "calificado"
  | "propuesta"
  | "negociacion"
  | "cerrado"
  | "perdido";

export interface ClienteFormData {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  empresa: string;
  estado: string;
  etapa_venta: string;
  rif: string;
  fecha_creacion: Date;
  notas: string;
  direccion: string;
  ciudad: string;
  direccion_entrega: string;
  google_maps: string;
  sector: string;
}

export interface Actividad {
  id: string;
  cliente_id: string;
  vendedor_id: string;
  tipo: "llamada" | "email" | "reunion" | "nota" | "tarea";
  titulo: string;
  descripcion: string;
  fecha: Date;
  completado: boolean;
  fecha_vencimiento: Date;
  fecha_creacion: Date;
  id_tipo_actividad?: string;
}

export interface ICrearActividad {
  titulo: string;
  tipo: string;
  descripcion: string;
  fecha: Date;
  fecha_vencimiento: Date;
  cliente_id: string;
  vendedor_id: string;
  completado: boolean;
}

export interface ReunionDb extends Omit<Reunion, 'fecha_inicio' | 'fecha_fin'> {
  fecha_creacion: string;
  fecha_actualizacion: string;
}
export interface Reunion {
  id: string;
  cliente_id: string;
  vendedor_id: string;
  titulo: string;
  descripcion: string;
  fecha_inicio: Date;
  fecha_fin: Date;
  ubicacion?: string;
  tipo: "presencial" | "virtual" | "telefonica";
  estado: "programada" | "completada" | "cancelada";
  recordatorio: boolean;
}

export interface ReunionCalendario extends Reunion {
 fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface ICrearReunion {
  cliente_id: string;
  vendedor_id: string;
  titulo: string;
  descripcion: string;
  fecha_inicio: Date;
  fecha_fin: Date;
  ubicacion?: string;
  tipo: "presencial" | "virtual" | "telefonica";
  estado: "programada" | "completada" | "cancelada";
  recordatorio: boolean;
}

export interface IFormReunion {
  cliente_id: string;
  vendedor_id: string;
  titulo: string;
  descripcion: string;
  fecha: Date;
  inicio: string;
  fin: string;
  ubicacion?: string;
  tipo: "presencial" | "virtual" | "telefonica";
  estado: "programada" | "completada" | "cancelada";
  recordatorio: boolean;
}

export interface Ticket {
  id: string;
  cliente_id: string;
  vendedor_id: string;
  titulo: string;
  descripcion: string;
  estado: "abierto" | "en_proceso" | "resuelto" | "cerrado";
  prioridad: "baja" | "media" | "alta" | "urgente";
  categoria: "tecnico" | "facturacion" | "producto" | "servicio";
  fecha_creacion: Date;
  fecha_actualizacion: Date;
  numero: number;
}

export interface Transporte {
  id: string;
  nombre: string;
  cedula: string;
  marca: string;
  modelo: string;
  placa: string;
}

export interface Pedido {
  id: string;
  cliente_id: string;
  vendedor_id: string;
  numero: string;
  subtotal: number;
  impuestos: number;
  total: number;
  estado: "pendiente" | "procesado";
  fecha_entrega: Date;
  notas?: string;
  fecha_creacion: Date;
  fecha_actualizacion?: Date;
  tipo_pago: "contado" | "credito";
  dias_credito?: number;
  moneda: "usd" | "bs";
  transporte: "interno" | "externo";
  transporte_detalle?: Transporte;
  evidencia_url?: string;
  productos_pedido: ProductoPedido[];
}

export enum MesEnum {
  Enero = "Enero",
  Febrero = "Febrero",
  Marzo = "Marzo",
  Abril = "Abril",
  Mayo = "Mayo",
  Junio = "Junio",
  Julio = "Julio",
  Agosto = "Agosto",
  Septiembre = "Septiembre",
  Octubre = "Octubre",
  Noviembre = "Noviembre",
  Diciembre = "Diciembre",
}


export interface Meta {
  id: string;
  vendedor_id: string;
  mes: MesEnum;
  ano: number;
  objetivo_ventas: number;
  objetivo_clientes: number;
  llamadas: number;
  reuniones: number;
  emails: number;
  tareas: number;
  fecha_creacion: Date;
  fecha_actualizacion: Date;
}

export interface Metrica {
  periodo: string;
  ventas: number;
  clientes: number;
  actividades: number;
  conversion: number;
}

export interface Oportunidad {
  id: string;
  cliente_id: string;
  vendedor_id: string;
  titulo: string;
  descripcion: string;
  valor: number;
  probabilidad: number;
  etapa: "inicial" | "calificado" | "propuesta" | "negociacion" | "cerrado";
  fecha_creacion: Date;
}

export interface ICreateOportunidad {
  cliente_id: string;
  vendedor_id: string;
  titulo: string;
  descripcion: string;
  valor: number;
  probabilidad: number;
  etapa: "inicial" | "calificado" | "propuesta" | "negociacion" | "cerrado";
  fecha_creacion: Date;
}

export interface ProductoPedido {
  pedido_id: string;
  nombre: string;
  descripcion?: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  fecha_creacion: string;
}

export interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  unidad_medida: string;
  fecha_creacion: string;
  precio_base?: number
}
export type formProducto = {
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  nombre: string;
  descripcion: string;
  precio_base: number;
  porcentaje_negociacion: number;
};

export interface PedidoData extends Pedido {
  productos: formProducto[];
  archivoAdjunto?: File | null;
  transporte_detalle?: Partial<Transporte>;
}



export interface ProductoPedido {
  id: string;
  pedido_id: string;
  nombre: string;
  cantidad: number;
  precio: number;
  total: number;
  producto_id: string;
  producto: Producto;
  precio_base?: number;
  porcentaje_negociacion?: number;
}

export interface ProductoDb {
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  precio_base?: number;
  porcentaje_negociacion?: number;
}

export interface PedidoDb {
  cliente_id: string;
  vendedor_id: string;
  fecha_entrega: Date;
  notas?: string;
  tipo_pago: "contado" | "credito";
  dias_credito?: number;
  moneda: "usd" | "bs";
  transporte: "interno" | "externo";
  transporte_detalle?: Partial<Transporte>;
  impuestos: 'iva' | 'exento';
}


export type ActividadFormateada = {
  id: string;
  type: string;
  title: string;
  time: string;
  status: 'vencida' | 'completada' | 'pendiente';
  cliente: string | undefined;
  vendedor: string | undefined;
};

export type Mes = {
  mes: string;
  ventas: number;
  clientes: number | undefined;
}

 export type CrearPedidoParams = {
    pedidoData: Partial<Pedido>;
    productosPedido: formProducto[];
    currentUser: User;
  };

  export interface Vendedor {
    id: string;
   supabase_id: string;
   nombre: string;
   apellido: string;
   telefono: string;
    fecha_creacion: Date;
    rol: "vendedor" | "admin";
    monto_negociacion_mes?: number;
  }

  export enum CustomerSector {
  ALIMENTOS_Y_BEBIDAS = 'Alimentos y Bebidas',
  NUTRICION_ANIMAL = 'Nutricion Animal',
  COSMETICA = 'Cosmetica',
  CUIDADO_PERSONAL = 'Cuidado Personal y del Hogar',
  PINTURA = 'Pintura',
  POLIMEROS = 'Polimeros y Material de Empaque',
  INDUSTRIA_FARMACEUTICA = 'Industria farmaceutica',
  INDUSTRIA_PETROLERA = 'Industria Petrolera',
}

// ===== MARKETING / LEADS / CHAT =====

export type OrigenLead = 'instagram' | 'web' | 'whatsapp';
export type TipoWeb = 'cotizacion' | 'informacion' | 'soporte';
export type CanalEntrada = 'instagram_boton' | 'web_formulario' | 'whatsapp_mensaje';
export type EstadoLead =
  | 'nuevo'
  | 'asignado'
  | 'contactado'
  | 'calificado'
  | 'convertido'
  | 'perdido'
  | 'reasignado';

export interface Lead {
  id: string;
  origen: OrigenLead;
  tipo_web: TipoWeb | null;
  canal_entrada: CanalEntrada;
  zona_id: string | null;
  estado: EstadoLead;
  vendedor_asignado_id: string | null;
  cliente_id: string | null;
  datos_contacto: {
    nombre: string;
    apellido?: string;
    telefono: string;
    email?: string;
    instagram_handle?: string;
    mensaje_inicial: string;
  };
  metadata: Record<string, unknown> | null;
  asignado_en: string | null;
  ultima_actividad_en: string | null;
  fecha_creacion: string;
  fecha_actualizacion: string;
  vendedor_asignado?: Vendedor | null;
  zona?: Zona | null;
  cliente?: Cliente | null;
  reasignaciones?: Reasignacion[];
  conversaciones?: Conversacion[];
}

export interface Reasignacion {
  id: string;
  lead_id: string;
  vendedor_anterior_id: string | null;
  vendedor_nuevo_id: string | null;
  motivo: 'sla_vencido' | 'manual_admin' | 'vendedor_inactivo' | 'sin_vendedor_zona';
  fecha: string;
  vendedor_anterior?: Vendedor | null;
  vendedor_nuevo?: Vendedor | null;
}

export interface LeadsResponse {
  data: Lead[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type EstadoConversacion = 'abierta' | 'cerrada' | 'transferida';
export type CanalConversacion = 'whatsapp' | 'instagram' | 'web_chat';
export type RemitenteTipo = 'vendedor' | 'lead' | 'sistema';
export type TipoMensaje = 'texto' | 'imagen' | 'documento' | 'ubicacion' | 'plantilla';

export interface Conversacion {
  id: string;
  lead_id: string;
  vendedor_id: string;
  estado: EstadoConversacion;
  canal: CanalConversacion;
  ultimo_mensaje_en: string | null;
  fecha_creacion: string;
  fecha_actualizacion: string;
  lead?: Lead;
  vendedor?: Vendedor;
  mensajes?: Mensaje[];
}

export interface Mensaje {
  id: string;
  conversacion_id: string;
  remitente_tipo: RemitenteTipo;
  remitente_id: string;
  contenido: string;
  tipo: TipoMensaje;
  metadata: Record<string, unknown> | null;
  detectado_sin_stock: boolean;
  fecha_creacion: string;
}

export interface Zona {
  id: string;
  nombre: string;
  descripcion: string;
  activa: boolean;
  estados?: string[];
  fecha_creacion: string;
  fecha_actualizacion: string;
  vendedores?: VendedorZona[];
}

export interface OpcionIntencion {
  numero: number;
  etiqueta: string;
  tipo_web: "cotizacion" | "informacion" | "soporte";
}

export interface MenuBienvenida {
  id: string;
  activo: boolean;
  mensaje_bienvenida: string;
  pregunta_estado: string;
  mensaje_sin_vendedor: string;
  pregunta_intencion: string;
  mensaje_confirmacion: string;
  opciones_intencion: OpcionIntencion[];
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface VendedorZona {
  id: string;
  vendedor_id: string;
  zona_id: string;
  fecha_asignacion: string;
  vendedor?: Vendedor;
  zona?: Zona;
}