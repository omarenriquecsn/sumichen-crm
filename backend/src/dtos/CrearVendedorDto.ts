import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateVendedorDto {
  @IsString()
  @MaxLength(100)
  nombre: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono?: string;
}
