import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Producto } from './Productos';
import { AlmacenEnum } from '../enums/AlmacenEnum';

/**
 * Lote de un producto en un almacén. El inventario diario crea un lote por
 * (producto, almacén, código de lote); el código de lote es único, nunca se
 * reutiliza. El stock disponible vive en `cantidad_actual` y se descuenta FIFO
 * (fecha_ingreso más antigua primero) al consumir pedidos.
 */
@Entity({ name: 'lotes' })
export class Lote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'producto_id' })
  producto_id: string;

  @ManyToOne(() => Producto, { nullable: false })
  @JoinColumn({ name: 'producto_id' })
  producto: Producto;

  @Column({ type: 'enum', enum: AlmacenEnum, enumName: 'almacen_enum' })
  almacen: AlmacenEnum;

  @Column({ name: 'codigo_lote', type: 'varchar' })
  codigo_lote: string;

  @Column({ name: 'fecha_ingreso', type: 'date' })
  fecha_ingreso: string;

  /** Fecha de vencimiento del lote (opcional; informativa para FIFO). */
  @Column({ name: 'fecha_vencimiento', type: 'date', nullable: true })
  fecha_vencimiento?: string | null;

  @Column({
    name: 'cantidad_inicial',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  cantidad_inicial: number;

  @Column({
    name: 'cantidad_actual',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  cantidad_actual: number;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'fecha_creacion', type: 'timestamptz' })
  fecha_creacion: Date;
}
