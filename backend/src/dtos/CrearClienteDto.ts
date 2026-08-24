import { IsEmail, IsOptional, IsString, MaxLength, IsEnum } from 'class-validator';
import { Unique } from 'typeorm';
import { CustomerSector } from '../types/customer.types';

export class CreateClienteDto {
  @IsString()
  @MaxLength(100)
  nombre: string;

  @IsString()
  apellido: string;

  @IsString()
  rif: string;

  @IsString()
  empresa: string;

  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsEnum(CustomerSector, { message: 'El sector proporcionado no es válido' })
  sector?: CustomerSector;
}
