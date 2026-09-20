import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Producto } from './Productos';
import { Lote } from './Lote';
import { Pedido } from './Pedidos';
import { AlmacenEnum } from '../enums/AlmacenEnum';
import { MovimientoInventarioTipoEnum } from '../enums/MovimientoInventarioTipoEnum';
import { MotivoAjusteEnum } from '../enums/MotivoAjusteEnum';

/**
 * Ledger de inventario: cada cambio de stock (entrada, reserva, salida,
 * liberación, devolución o ajuste) queda registrado aquí para auditoría.
 * `cantidad` siempre es positiva; `tipo` indica el sentido del movimiento.
 */
@Entity({ name: 'movimientos_inventario' })
export class MovimientoInventario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: MovimientoInventarioTipoEnum,
    enumName: 'movimiento_inventario_tipo_enum',
  })
  tipo: MovimientoInventarioTipoEnum;

  @Column({ name: 'producto_id' })
  producto_id: string;

  @ManyToOne(() => Producto, { nullable: false })
  @JoinColumn({ name: 'producto_id' })
  producto: Producto;

  @Column({ name: 'lote_id', type: 'uuid', nullable: true })
  lote_id?: string;

  @ManyToOne(() => Lote, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'lote_id' })
  lote?: Lote;

  @Column({
    type: 'enum',
    enum: AlmacenEnum,
    enumName: 'almacen_enum',
    nullable: true,
  })
  almacen?: AlmacenEnum;

  @Column({ name: 'pedido_id', type: 'uuid', nullable: true })
  pedido_id?: string;

  @ManyToOne(() => Pedido, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'pedido_id' })
  pedido?: Pedido;

  @Column({ name: 'devolucion_id', type: 'uuid', nullable: true })
  devolucion_id?: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  cantidad: number;

  @Column({
    name: 'saldo_resultante',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  saldo_resultante: number;

  @Column({ name: 'usuario_id', type: 'uuid', nullable: true })
  usuario_id?: string;

  /** Categoría del motivo (solo en ajustes manuales). */
  @Column({
    name: 'motivo_categoria',
    type: 'enum',
    enum: MotivoAjusteEnum,
    enumName: 'motivo_ajuste_enum',
    nullable: true,
  })
  motivo_categoria?: MotivoAjusteEnum;

  @Column({ type: 'text', nullable: true })
  observacion?: string;

  @CreateDateColumn({ name: 'fecha_creacion', type: 'timestamptz' })
  fecha_creacion: Date;
}
