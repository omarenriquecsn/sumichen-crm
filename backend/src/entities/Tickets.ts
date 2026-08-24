import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Cliente } from './Clientes';
import { Vendedor } from './Vendedores';
import { EstadoTicketEnum } from '../enums/EstadoTicketEnum';
import { CategoriaTicketEnum } from '../enums/CategoriaTicketEnum';
import { PrioridadTicketEnum } from '../enums/PrioridadTicketEnum';

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'cliente_id' })
  cliente_id: string;

  @ManyToOne(() => Cliente)
  @JoinColumn({ name: 'cliente_id' })
  cliente: Cliente;

  @Column({ name: 'vendedor_id' })
  vendedor_id: string;

  @ManyToOne(() => Vendedor)
  @JoinColumn({ name: 'vendedor_id' })
  vendedor: Vendedor;

  @Column({ type: 'varchar', length: 50 })
  numero: string;

  @Column({ type: 'varchar', length: 150 })
  titulo: string;

  @Column()
  descripcion: string;

  @Column({
    type: 'enum',
    enum: EstadoTicketEnum,
    default: EstadoTicketEnum.ABIERTO,
  })
  estado: EstadoTicketEnum;

  @Column({
    type: 'enum',
    enum: PrioridadTicketEnum,
    default: PrioridadTicketEnum.MEDIA,
  })
  prioridad: PrioridadTicketEnum;

  @Column({
    type: 'enum',
    enum: CategoriaTicketEnum,
    default: CategoriaTicketEnum.PRODUCTO,
  })
  categoria: CategoriaTicketEnum;

  @CreateDateColumn({ type: 'timestamptz' })
  fecha_creacion: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  fecha_actualizacion: Date;
}
