import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Pedido } from './Pedidos';
import { Vendedor } from './Vendedores';
import { DevolucionDetalle } from './DevolucionDetalle';
import { DevolucionTipoEnum } from '../enums/DevolucionTipoEnum';

/**
 * Cabecera de una devolución (total o parcial) de un pedido confirmado.
 * El detalle por producto/lote vive en `devoluciones_detalle`.
 */
@Entity({ name: 'devoluciones' })
export class Devolucion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'pedido_id' })
  pedido_id: string;

  @ManyToOne(() => Pedido, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pedido_id' })
  pedido: Pedido;

  @Column({
    type: 'enum',
    enum: DevolucionTipoEnum,
    enumName: 'devolucion_tipo_enum',
  })
  tipo: DevolucionTipoEnum;

  @Column({ type: 'text', nullable: true })
  motivo?: string;

  @Column({ type: 'text', nullable: true })
  notas?: string;

  @Column({ name: 'usuario_id', type: 'uuid', nullable: true })
  usuario_id?: string;

  @ManyToOne(() => Vendedor, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'usuario_id' })
  usuario?: Vendedor;

  @Column({
    name: 'total_devuelto',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  total_devuelto: number;

  @CreateDateColumn({ name: 'fecha_creacion', type: 'timestamptz' })
  fecha_creacion: Date;

  @OneToMany(() => DevolucionDetalle, (detalle) => detalle.devolucion, {
    cascade: true,
  })
  detalles: DevolucionDetalle[];
}
