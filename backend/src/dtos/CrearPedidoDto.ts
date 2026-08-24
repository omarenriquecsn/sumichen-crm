import { DiasCreditoEnum } from '../enums/DiasCreditoEnum';
import { MonedaEnum } from '../enums/MonedaEnum';
import { TipoPagoEnum } from '../enums/TipoPagoEnum';
import { TransporteEnum } from '../enums/TransporteEnum';

class Producto_pedido {
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  precio_base: number;
  porcentaje_negociacion: number;
}

export class CrearPedidoDto {
  cliente_id: string;
  vendedor_id: string;
  impuestos: 'iva' | 'exento';
  moneda: MonedaEnum;
  tipo_pago: TipoPagoEnum;
  fecha_entrega: Date;
  notas?: string;
  dias_credito?: DiasCreditoEnum;
  transporte: TransporteEnum;
  transporte_detalle?: {
    nombre?: string;
    cedula?: string;
    marca?: string;
    modelo?: string;
    placa?: string;
  };
  productos: Producto_pedido[];
}
