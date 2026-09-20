/**
 * Motivo de un ajuste manual de inventario. El detalle libre va en la
 * observación del movimiento (`movimientos_inventario.observacion`).
 */
export enum MotivoAjusteEnum {
  CONTEO_FISICO = 'conteo_fisico',
  MERMA = 'merma',
  DANO = 'dano',
  VENCIMIENTO = 'vencimiento',
  CORRECCION = 'correccion',
  OTRO = 'otro',
}
