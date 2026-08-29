/**
 * Eventos de negocio que pueden disparar notificaciones push (PWA).
 * Cada usuario configura cuáles quiere recibir en Configuración → Notificaciones
 * (tabla `preferencias_notificaciones`). Si no hay fila para un evento, está
 * habilitado por defecto.
 *
 * Los valores son keys estables que se comparten con el frontend
 * (project/src/constants/eventosNotificacion.ts). NO renombrarlos sin migrar.
 */
export const EventoNotificacionEnum = {
  PEDIDO_NUEVO: 'pedido_nuevo',
  PEDIDO_APROBADO: 'pedido_aprobado',
  PEDIDO_CANCELADO: 'pedido_cancelado',
  LEAD_ASIGNADO: 'lead_asignado',
  LEAD_REASIGNADO: 'lead_reasignado',
  LEAD_PERDIDO: 'lead_perdido',
  LEAD_NUEVO_SIN_ASIGNAR: 'lead_nuevo_sin_asignar',
  SLA_VENCIDO_SIN_VENDEDOR: 'sla_vencido_sin_vendedor',
  LEAD_CONVERTIDO: 'lead_convertido',
  TICKET_NUEVO: 'ticket_nuevo',
  PRODUCTOS_ACTUALIZADOS: 'productos_actualizados',
  ACTIVIDAD_PROXIMA: 'actividad_proxima',
  MENSAJE_NUEVO: 'mensaje_nuevo',
} as const;

export type EventoNotificacion = (typeof EventoNotificacionEnum)[keyof typeof EventoNotificacionEnum];
