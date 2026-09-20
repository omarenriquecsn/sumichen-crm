import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { TipoInstrumento } from './TipoInstrumento';
import { Cliente } from './Clientes';
import { Pedido } from './Pedidos';
import { AlmacenEnum } from '../enums/AlmacenEnum';
import { MovimientoInstrumentoTipoEnum } from '../enums/MovimientoInstrumentoTipoEnum';

/** Ledger de instrumentos retornables (kardex). */
@Entity({ name: 'movimientos_instrumento' })
export class MovimientoInstrumento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: MovimientoInstrumentoTipoEnum,
    enumName: 'movimiento_instrumento_tipo_enum',
  })
  tipo: MovimientoInstrumentoTipoEnum;

  @Column({ name: 'tipo_instrumento_id' })
  tipo_instrumento_id: string;

  @ManyToOne(() => TipoInstrumento, { nullable: false })
  @JoinColumn({ name: 'tipo_instrumento_id' })
  tipo_instrumento: TipoInstrumento;

  @Column({
    type: 'enum',
    enum: AlmacenEnum,
    enumName: 'almacen_enum',
    nullable: true,
  })
  almacen?: AlmacenEnum;

  @Column({ name: 'cliente_id', type: 'uuid', nullable: true })
  cliente_id?: string;

  @ManyToOne(() => Cliente, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'cliente_id' })
  cliente?: Cliente;

  @Column({ name: 'pedido_id', type: 'uuid', nullable: true })
  pedido_id?: string;

  @ManyToOne(() => Pedido, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'pedido_id' })
  pedido?: Pedido;

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

  @Column({ type: 'text', nullable: true })
  observacion?: string;

  @CreateDateColumn({ name: 'fecha_creacion', type: 'timestamptz' })
  fecha_creacion: Date;
}
