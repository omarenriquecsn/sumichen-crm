/**
 * Tipos de movimiento del ledger de inventario (tabla
 * `movimientos_inventario`). Cada cambio de stock queda auditado.
 *
 * - ENTRADA:    ingreso de mercancía nueva (carga del Excel).
 * - RESERVA:    salida al crear un pedido pendiente (queda reservada).
 * - SALIDA:     al confirmar el pedido (reserva → salida definitiva).
 * - LIBERACION: al cancelar un pedido pendiente (devuelve el stock).
 * - DEVOLUCION: al registrar una devolución (total o parcial).
 * - AJUSTE:     corrección manual de inventario (solo admin).
 */
export enum MovimientoInventarioTipoEnum {
  ENTRADA = 'entrada',
  RESERVA = 'reserva',
  SALIDA = 'salida',
  LIBERACION = 'liberacion',
  DEVOLUCION = 'devolucion',
  AJUSTE = 'ajuste',
}
