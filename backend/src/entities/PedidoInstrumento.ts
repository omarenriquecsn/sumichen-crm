import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Pedido } from './Pedidos';
import { TipoInstrumento } from './TipoInstrumento';
import { AlmacenEnum } from '../enums/AlmacenEnum';
import { EstadoInstrumentoEnum } from '../enums/EstadoInstrumentoEnum';

/**
 * Línea de instrumentos retornables de un pedido. Los contadores suman
 * `cantidad` (en tránsito + en cliente + en almacén + donado + dañado).
 */
@Entity({ name: 'pedido_instrumentos' })
export class PedidoInstrumento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'pedido_id' })
  pedido_id: string;

  @ManyToOne(() => Pedido, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pedido_id' })
  pedido: Pedido;

  @Column({ name: 'tipo_instrumento_id' })
  tipo_instrumento_id: string;

  @ManyToOne(() => TipoInstrumento, { nullable: false })
  @JoinColumn({ name: 'tipo_instrumento_id' })
  tipo_instrumento: TipoInstrumento;

  @Column({ type: 'enum', enum: AlmacenEnum, enumName: 'almacen_enum' })
  almacen: AlmacenEnum;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  cantidad: number;

  @Column({
    name: 'cantidad_transito',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  cantidad_transito: number;

  @Column({
    name: 'cantidad_cliente',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  cantidad_cliente: number;

  @Column({
    name: 'cantidad_almacen',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  cantidad_almacen: number;

  @Column({
    name: 'cantidad_donada',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  cantidad_donada: number;

  @Column({
    name: 'cantidad_danada',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  cantidad_danada: number;

  @Column({
    type: 'enum',
    enum: EstadoInstrumentoEnum,
    enumName: 'estado_instrumento_enum',
    default: EstadoInstrumentoEnum.EN_TRANSITO,
  })
  estado: EstadoInstrumentoEnum;

  @CreateDateColumn({ name: 'fecha_creacion', type: 'timestamptz' })
  fecha_creacion: Date;
}
