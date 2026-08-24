import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { RolesEnum } from '../enums/RolesEnum';
import { VendedorZona } from './VendedorZona';

@Entity({ name: 'vendedores' })
export class Vendedor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  supabase_id: string;

  @Column()
  nombre: string;

  @Column()
  apellido: string;

  @Column({ nullable: true })
  telefono?: string;

  @Column({ type: 'enum', enum: RolesEnum, default: RolesEnum.VENDEDOR })
  rol: RolesEnum;

  @Column({ type: 'boolean', default: true })
  activo?: boolean;

  @Column({ nullable: true, default: 0 })
  meta_mensual_ventas?: number;

  @Column({ nullable: true, default: 0 })
  meta_mensual_clientes?: number;

   @Column({ nullable: true, default: 0 })
  monto_negociacion_mes?: number;

  @CreateDateColumn({ type: 'timestamptz' })
  fecha_creacion?: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  fecha_actualizacion?: Date;

  @OneToMany(() => VendedorZona, (vz) => vz.vendedor)
  zonas: VendedorZona[];
}
