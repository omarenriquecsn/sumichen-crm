import { IsString, MaxLength } from 'class-validator';

export class CreateProductoDto {
  @IsString()
  @MaxLength(100)
  nombre: string;

  @IsString()
  descripcion: string;

  @IsString()
  @MaxLength(50)
  unidad_medida: string;
}
