import { IsDecimal, IsInt, IsUUID, Min } from 'class-validator';

export class CreateProductosPedidoDto {
  @IsUUID()
  producto_id: string;

  @IsDecimal({ decimal_digits: '2' })
  precio_unitario: number;

  @IsInt()
  @Min(1)
  cantidad: number;

  @IsUUID()
  pedido_id: string;
}
