// src/entities/productos-pedido.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Producto } from './Productos';
import { Pedido } from './Pedidos';

@Entity('productos_pedido')
export class ProductosPedido {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'producto_id' })
  producto_id: string;

  @ManyToOne(() => Producto, { eager: true, nullable: false })
  @JoinColumn({ name: 'producto_id' })
  producto: Producto;

  @Column({ type: 'decimal', precision: 12, scale: 4 })
  precio_unitario: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number;

  @Column({ type: 'decimal', precision: 12, scale: 4 })
  precio_base: number

  @Column({ type: 'decimal', precision: 12, scale: 4 })
  porcentaje_negociacion: number

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  cantidad: number;

  @Column({ name: 'pedido_id' })
  pedido_id: string;

  @ManyToOne(() => Pedido, { nullable: false })
  @JoinColumn({ name: 'pedido_id' })
  pedido: Pedido;

}
