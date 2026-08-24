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
import { EtapaDeVentaEnum } from '../enums/EtapaDeVentaEnum';

@Entity('oportunidades')
export class Oportunidad {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'cliente_id', unique: true })
  cliente_id: string;

  @ManyToOne(() => Cliente, { nullable: false })
  @JoinColumn({ name: 'cliente_id' })
  cliente: Cliente;

  @Column({ name: 'vendedor_id' })
  vendedor_id: string;

  @ManyToOne(() => Vendedor, { nullable: false })
  @JoinColumn({ name: 'vendedor_id' })
  vendedor: Vendedor;

  @Column({ type: 'varchar', length: 150 })
  titulo: string;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  valor: number;

  @Column({ type: 'int' })
  probabilidad: number;

  @Column({
    type: 'enum',
    enum: EtapaDeVentaEnum,
    default: EtapaDeVentaEnum.INICIAL,
    nullable: true,
  })
  etapa: EtapaDeVentaEnum;

  @Column({ type: 'timestamptz', nullable: true })
  fecha_cierre_estimada?: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  fecha_creacion: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  fecha_actualizacion: Date;
}
