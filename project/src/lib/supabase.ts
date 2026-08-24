import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(`Missing Supabase environment variables:
    VITE_SUPABASE_URL: ${supabaseUrl ? 'present' : 'missing'}
    VITE_SUPABASE_ANON_KEY: ${supabaseAnonKey ? 'present' : 'missing'}
  `);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    storage: localStorage,
    lock: async (_name, _acquireTimeout, fn) => {
      return await fn();
    },
  }
});

// Tipos de base de datos
export interface Database {
  public: {
    Tables: {
      vendedores: {
        Row: {
          id: string;
          nombre: string;
          apellido: string;
          telefono: string | null;
          rol: 'vendedor' | 'admin';
          activo: boolean;
          meta_mensual_ventas: number;
          meta_mensual_clientes: number;
          fecha_creacion: string;
          fecha_actualizacion: string;
        };
        Insert: {
          id: string;
          nombre: string;
          apellido: string;
          telefono?: string;
          rol?: 'vendedor' | 'admin';
          activo?: boolean;
          meta_mensual_ventas?: number;
          meta_mensual_clientes?: number;
        };
        Update: {
          nombre?: string;
          apellido?: string;
          telefono?: string;
          rol?: 'vendedor' | 'admin';
          activo?: boolean;
          meta_mensual_ventas?: number;
          meta_mensual_clientes?: number;
        };
      };
      clientes: {
        Row: {
          id: string;
          vendedor_id: string;
          nombre: string;
          apellido: string;
          email: string;
          telefono: string | null;
          empresa: string | null;
          cargo: string | null;
          estado: 'prospecto' | 'cliente' | 'inactivo';
          etapa_venta: 'inicial' | 'calificado' | 'propuesta' | 'negociacion' | 'cerrado' | 'perdido';
          valor_potencial: number;
          probabilidad: number;
          direccion: string | null;
          ciudad: string | null;
          codigo_postal: string | null;
          notas: string | null;
          fecha_creacion: string;
          ultima_actividad: string;
          fecha_actualizacion: string;
        };
        Insert: {
          vendedor_id: string;
          nombre: string;
          apellido: string;
          email: string;
          telefono?: string;
          empresa?: string;
          cargo?: string;
          estado?: 'prospecto' | 'cliente' | 'inactivo';
          etapa_venta?: 'inicial' | 'calificado' | 'propuesta' | 'negociacion' | 'cerrado' | 'perdido';
          valor_potencial?: number;
          probabilidad?: number;
          direccion?: string;
          ciudad?: string;
          codigo_postal?: string;
          notas?: string;
        };
        Update: {
          nombre?: string;
          apellido?: string;
          email?: string;
          telefono?: string;
          empresa?: string;
          cargo?: string;
          estado?: 'prospecto' | 'cliente' | 'inactivo';
          etapa_venta?: 'inicial' | 'calificado' | 'propuesta' | 'negociacion' | 'cerrado' | 'perdido';
          valor_potencial?: number;
          probabilidad?: number;
          direccion?: string;
          ciudad?: string;
          codigo_postal?: string;
          notas?: string;
        };
      };
      actividades: {
        Row: {
          id: string;
          cliente_id: string;
          vendedor_id: string;
          tipo: 'llamada' | 'email' | 'reunion' | 'nota' | 'tarea';
          titulo: string;
          descripcion: string | null;
          fecha: string;
          fecha_vencimiento: string | null;
          completado: boolean;
          fecha_creacion: string;
          fecha_actualizacion: string;
        };
        Insert: {
          cliente_id: string;
          vendedor_id: string;
          tipo: 'llamada' | 'email' | 'reunion' | 'nota' | 'tarea';
          titulo: string;
          descripcion?: string;
          fecha?: string;
          fecha_vencimiento?: string;
          completado?: boolean;
        };
        Update: {
          tipo?: 'llamada' | 'email' | 'reunion' | 'nota' | 'tarea';
          titulo?: string;
          descripcion?: string;
          fecha?: string;
          fecha_vencimiento?: string;
          completado?: boolean;
        };
      };
      reuniones: {
        Row: {
          id: string;
          cliente_id: string;
          vendedor_id: string;
          titulo: string;
          descripcion: string | null;
          fecha_inicio: string;
          fecha_fin: string;
          ubicacion: string | null;
          tipo: 'presencial' | 'virtual' | 'telefonica';
          estado: 'programada' | 'completada' | 'cancelada';
          recordatorio: boolean;
          enlace_reunion: string | null;
          fecha_creacion: string;
          fecha_actualizacion: string;
        };
        Insert: {
          cliente_id: string;
          vendedor_id: string;
          titulo: string;
          descripcion?: string;
          fecha_inicio: string;
          fecha_fin: string;
          ubicacion?: string;
          tipo?: 'presencial' | 'virtual' | 'telefonica';
          estado?: 'programada' | 'completada' | 'cancelada';
          recordatorio?: boolean;
          enlace_reunion?: string;
        };
        Update: {
          titulo?: string;
          descripcion?: string;
          fecha_inicio?: string;
          fecha_fin?: string;
          ubicacion?: string;
          tipo?: 'presencial' | 'virtual' | 'telefonica';
          estado?: 'programada' | 'completada' | 'cancelada';
          recordatorio?: boolean;
          enlace_reunion?: string;
        };
      };
      tickets: {
        Row: {
          id: string;
          cliente_id: string;
          vendedor_id: string;
          numero: string;
          titulo: string;
          descripcion: string;
          estado: 'abierto' | 'en_proceso' | 'resuelto' | 'cerrado';
          prioridad: 'baja' | 'media' | 'alta' | 'urgente';
          categoria: 'tecnico' | 'facturacion' | 'producto' | 'servicio' | 'general';
          fecha_creacion: string;
          fecha_actualizacion: string;
        };
        Insert: {
          cliente_id: string;
          vendedor_id: string;
          titulo: string;
          descripcion: string;
          estado?: 'abierto' | 'en_proceso' | 'resuelto' | 'cerrado';
          prioridad?: 'baja' | 'media' | 'alta' | 'urgente';
          categoria?: 'tecnico' | 'facturacion' | 'producto' | 'servicio' | 'general';
        };
        Update: {
          titulo?: string;
          descripcion?: string;
          estado?: 'abierto' | 'en_proceso' | 'resuelto' | 'cerrado';
          prioridad?: 'baja' | 'media' | 'alta' | 'urgente';
          categoria?: 'tecnico' | 'facturacion' | 'producto' | 'servicio' | 'general';
        };
      };
      pedidos: {
        Row: {
          id: string;
          cliente_id: string;
          vendedor_id: string;
          numero: string;
          estado: 'borrador' | 'enviado' | 'aprobado' | 'rechazado' | 'procesando' | 'completado';
          subtotal: number;
          impuestos: number;
          total: number;
          fecha_entrega: string | null;
          notas: string | null;
          fecha_creacion: string;
          fecha_actualizacion: string;
        };
        Insert: {
          cliente_id: string;
          vendedor_id: string;
          estado?: 'borrador' | 'enviado' | 'aprobado' | 'rechazado' | 'procesando' | 'completado';
          subtotal?: number;
          impuestos?: number;
          total?: number;
          fecha_entrega?: string;
          notas?: string;
        };
        Update: {
          estado?: 'borrador' | 'enviado' | 'aprobado' | 'rechazado' | 'procesando' | 'completado';
          subtotal?: number;
          impuestos?: number;
          total?: number;
          fecha_entrega?: string;
          notas?: string;
        };
      };
      oportunidades: {
        Row: {
          id: string;
          cliente_id: string;
          vendedor_id: string;
          titulo: string;
          descripcion: string | null;
          valor: number;
          probabilidad: number;
          etapa: 'inicial' | 'calificado' | 'propuesta' | 'negociacion' | 'cerrado' | 'perdido';
          fecha_cierre_estimada: string | null;
          fecha_creacion: string;
          fecha_actualizacion: string;
        };
        Insert: {
          cliente_id: string;
          vendedor_id: string;
          titulo: string;
          descripcion?: string;
          valor?: number;
          probabilidad?: number;
          etapa?: 'inicial' | 'calificado' | 'propuesta' | 'negociacion' | 'cerrado' | 'perdido';
          fecha_cierre_estimada?: string;
        };
        Update: {
          titulo?: string;
          descripcion?: string;
          valor?: number;
          probabilidad?: number;
          etapa?: 'inicial' | 'calificado' | 'propuesta' | 'negociacion' | 'cerrado' | 'perdido';
          fecha_cierre_estimada?: string;
        };
      };
    };
  };
}