/**
 * Tipos de movimiento del kardex de instrumentos retornables.
 *
 * - ENTRADA:    compra/reposición o conteo inicial.
 * - PRESTAMO:   salida al crear un pedido (queda en tránsito).
 * - ENTREGA:    el pedido se entrega al cliente (tránsito → cliente).
 * - DEVOLUCION: el cliente devuelve (cliente/tránsito → almacén).
 * - DONACION:   se dona (terminal, no vuelve al conteo).
 * - DANO:       se daña (terminal, no vuelve al conteo).
 * - AJUSTE:     corrección manual de conteo.
 * - LIBERACION: cancelación de un pedido (tránsito → almacén).
 */
export enum MovimientoInstrumentoTipoEnum {
  ENTRADA = 'entrada',
  PRESTAMO = 'prestamo',
  ENTREGA = 'entrega',
  DEVOLUCION = 'devolucion',
  DONACION = 'donacion',
  DANO = 'dano',
  AJUSTE = 'ajuste',
  LIBERACION = 'liberacion',
}
