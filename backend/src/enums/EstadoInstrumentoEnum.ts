/**
 * Ubicación/estado de un instrumento retornable (paleta, tambor, baritanque,
 * carboya...). `donado` y `danado` son terminales: ya no vuelven al conteo.
 */
export enum EstadoInstrumentoEnum {
  EN_ALMACEN = 'en_almacen',
  EN_TRANSITO = 'en_transito',
  EN_CLIENTE = 'en_cliente',
  DONADO = 'donado',
  DANADO = 'danado',
}
