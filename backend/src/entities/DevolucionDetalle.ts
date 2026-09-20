import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Devolucion } from './Devolucion';
import { ProductosPedido } from './Productos_pedido';
import { AlmacenEnum } from '../enums/AlmacenEnum';

/**
 * Detalle de una devolución: cuántos kg de una línea del pedido se devolvieron
 * y a qué lote/almacén se restituyeron.
 */
@Entity({ name: 'devoluciones_detalle' })
export class DevolucionDetalle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'devolucion_id' })
  devolucion_id: string;

  @ManyToOne(() => Devolucion, (devolucion) => devolucion.detalles, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'devolucion_id' })
  devolucion: Devolucion;

  @Column({ name: 'productos_pedido_id', type: 'uuid', nullable: true })
  productos_pedido_id?: string;

  @ManyToOne(() => ProductosPedido, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'productos_pedido_id' })
  producto_pedido?: ProductosPedido;

  @Column({ name: 'producto_id' })
  producto_id: string;

  @Column({ type: 'enum', enum: AlmacenEnum, enumName: 'almacen_enum' })
  almacen: AlmacenEnum;

  @Column({ name: 'lote_id', type: 'uuid', nullable: true })
  lote_id?: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  cantidad: number;
}
