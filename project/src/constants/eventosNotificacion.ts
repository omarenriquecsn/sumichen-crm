import {
  ShoppingCart,
  CheckCircle,
  XCircle,
  UserPlus,
  RefreshCw,
  UserX,
  Inbox,
  AlertTriangle,
  UserCheck,
  MessageSquare,
  Package,
  CalendarClock,
  LifeBuoy,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Catálogo de eventos de notificación push (deben coincidir con
 * `EventoNotificacionEnum` del backend). Se usa en Configuración → Notificaciones
 * para que cada usuario elija qué notificaciones recibe en sus dispositivos.
 *
 * ⚠ No cambiar los valores `evento` sin sincronizar con el backend (tabla
 * `preferencias_notificaciones`).
 */
export interface EventoNotificacionConfig {
  evento: string;
  etiqueta: string;
  descripcion: string;
  icono: LucideIcon;
}

export interface CategoriaNotificaciones {
  categoria: string;
  eventos: EventoNotificacionConfig[];
}

export const CATEGORIAS_NOTIFICACIONES: CategoriaNotificaciones[] = [
  {
    categoria: "Pedidos",
    eventos: [
      {
        evento: "pedido_nuevo",
        etiqueta: "Nuevo pedido creado",
        descripcion: "Se avisa a los administradores cuando se crea un pedido.",
        icono: ShoppingCart,
      },
      {
        evento: "pedido_aprobado",
        etiqueta: "Pedido aprobado",
        descripcion: "Se avisa al vendedor cuando su pedido es confirmado/aprobado.",
        icono: CheckCircle,
      },
      {
        evento: "pedido_cancelado",
        etiqueta: "Pedido cancelado",
        descripcion: "Se avisa al vendedor y a los admins cuando un pedido se cancela.",
        icono: XCircle,
      },
    ],
  },
  {
    categoria: "Leads",
    eventos: [
      {
        evento: "lead_asignado",
        etiqueta: "Nuevo lead asignado (12h)",
        descripcion: "Se avisa al vendedor cuando se le asigna un lead, recordando el SLA de 12 horas.",
        icono: UserPlus,
      },
      {
        evento: "lead_reasignado",
        etiqueta: "Lead reasignado",
        descripcion: "Se avisa al nuevo vendedor cuando un lead le es reasignado (manual o por SLA vencido).",
        icono: RefreshCw,
      },
      {
        evento: "lead_perdido",
        etiqueta: "Lead perdido",
        descripcion: "Se avisa a los administradores cuando un lead se marca como perdido.",
        icono: UserX,
      },
      {
        evento: "lead_nuevo_sin_asignar",
        etiqueta: "Nuevo lead sin vendedor",
        descripcion: "Se avisa a los administradores cuando llega un lead que nadie atiende aún.",
        icono: Inbox,
      },
      {
        evento: "sla_vencido_sin_vendedor",
        etiqueta: "SLA vencido sin vendedor",
        descripcion: "Se avisa a los administradores cuando un lead vence el SLA y no hay vendedor disponible en su zona.",
        icono: AlertTriangle,
      },
      {
        evento: "lead_convertido",
        etiqueta: "Lead convertido a cliente",
        descripcion: "Se avisa al vendedor y a los admins cuando un lead se convierte en cliente.",
        icono: UserCheck,
      },
    ],
  },
  {
    categoria: "Chat",
    eventos: [
      {
        evento: "mensaje_nuevo",
        etiqueta: "Nuevo mensaje del cliente",
        descripcion: "Se avisa al vendedor cuando un cliente escribe en su conversación.",
        icono: MessageSquare,
      },
    ],
  },
  {
    categoria: "Catálogo",
    eventos: [
      {
        evento: "productos_actualizados",
        etiqueta: "Productos actualizados",
        descripcion: "Se avisa a todos cuando se sube un nuevo inventario.xlsx a Supabase.",
        icono: Package,
      },
    ],
  },
  {
    categoria: "Agenda",
    eventos: [
      {
        evento: "actividad_proxima",
        etiqueta: "Actividad próxima",
        descripcion: "Se avisa al vendedor 1 hora antes de una reunión, llamada o correo agendado.",
        icono: CalendarClock,
      },
    ],
  },
  {
    categoria: "Soporte",
    eventos: [
      {
        evento: "ticket_nuevo",
        etiqueta: "Nuevo ticket de soporte",
        descripcion: "Se avisa a los administradores cuando se crea un ticket.",
        icono: LifeBuoy,
      },
    ],
  },
];

export const EVENTOS_NOTIFICACIONES: EventoNotificacionConfig[] =
  CATEGORIAS_NOTIFICACIONES.flatMap((c) => c.eventos);
