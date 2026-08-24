import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Vendedor } from './Vendedores';
import { EtapaDeVentaEnum } from '../enums/EtapaDeVentaEnum';
import { EstadoClienteEnum } from '../enums/EstadoClienteEnum';
import { CustomerSector } from '../types/customer.types';

@Entity('clientes')
export class Cliente {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  rif: string;

  @Column({ name: 'vendedor_id' })
  vendedor_id: string;

  @ManyToOne(() => Vendedor)
  @JoinColumn({ name: 'vendedor_id' })
  vendedor: Vendedor;

  @Column()
  nombre: string;

  @Column()
  apellido: string;

  @Column()
  email: string;

  @Column()
  telefono?: string;

  @Column()
  empresa: string;

  @Column({
    type: 'enum',
    enum: EstadoClienteEnum,
    default: EstadoClienteEnum.ACTIVO,
  })
  estado: EstadoClienteEnum;

  @Column({
    type: 'enum',
    enum: EtapaDeVentaEnum,
    default: EtapaDeVentaEnum.INICIAL,
  })
  etapa_venta: EtapaDeVentaEnum;

  // En tu entidad Cliente
  @Column({ type: 'text', nullable: true })
  estado_anterior?: string;

  @Column({ type: 'timestamptz', nullable: true })
  fecha_estado?: Date;

  @Column({ type: 'text', nullable: true })
  notas?: string;

  @Column({ nullable: true, default: 'sin direccion' })
  direccion: string;

  @Column({ nullable: true, default: 'valencia' })
  ciudad: string;

  @Column({ nullable: true })
  direccion_entrega?: string;

  @Column({ nullable: true })
  google_maps?: string;

  @Column({ type: 'date', nullable: true, default: new Date() })
  fecha_creacion?: Date;

  @Column({ type: 'date', nullable: true, default: new Date() })
  fecha_actualizacion?: Date;

  @Column({
    type: 'enum',
    enum: CustomerSector,
    nullable: true, // ¡Clave para no romper registros anteriores!
  })
  sector?: CustomerSector;
}
