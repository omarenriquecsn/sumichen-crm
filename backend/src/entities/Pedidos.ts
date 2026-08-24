import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Cliente } from './Clientes';
import { Vendedor } from './Vendedores';
import { ProductosPedido } from './Productos_pedido';
import { TipoPagoEnum } from '../enums/TipoPagoEnum';
import { DiasCreditoEnum } from '../enums/DiasCreditoEnum';
import { MonedaEnum } from '../enums/MonedaEnum';
import { TransporteEnum } from '../enums/TransporteEnum';
import { EstadoPedidoEnum } from '../enums/EstadoPedidoEnum';
import { Transporte } from './Transporte';

@Entity('pedidos')
export class Pedido {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'integer', default: () => "nextval('numero_seq')" })
  numero: number;

  @Column({ name: 'cliente_id' })
  cliente_id: string;

  @ManyToOne(() => Cliente, { nullable: false })
  @JoinColumn({ name: 'cliente_id' })
  cliente: Cliente;

  @Column({ name: 'vendedor_id' })
  vendedor_id: string;

  @ManyToOne(() => Vendedor, { nullable: false })
  @JoinColumn({ name: 'vendedor_id' })
  vendedor: Vendedor;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  subtotal: number;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  impuestos: number;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  total: number;

  @Column({ type: 'timestamptz' })
  fecha_entrega: Date;

  @Column({ type: 'text', nullable: true })
  notas?: string;

  @Column({ type: 'enum', enum: TipoPagoEnum, default: TipoPagoEnum.CONTADO })
  tipo_pago: TipoPagoEnum;

  @Column({ type: 'integer', default: 0, nullable: true })
  dias_credito?: number;

  @Column({ type: 'enum', enum: MonedaEnum, default: MonedaEnum.DOLARES })
  moneda: MonedaEnum;

  @Column({
    type: 'enum',
    enum: TransporteEnum,
    default: TransporteEnum.INTERNO,
    nullable: true,
  })
  transporte?: TransporteEnum;

  @CreateDateColumn({ type: 'timestamptz' })
  fecha_creacion: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  fecha_actualizacion: Date;

  @OneToMany(
    () => ProductosPedido,
    (productos_pedido) => productos_pedido.pedido,
    { eager: true },
  )
  productos_pedido: ProductosPedido[];

  @Column({ type: 'text', nullable: true })
  evidencia_url?: string;

  @Column({
    type: 'enum',
    enum: EstadoPedidoEnum,
    default: EstadoPedidoEnum.PENDIENTE,
  })
  estado: EstadoPedidoEnum;

   @OneToOne(() => Transporte, (transporte) => transporte.pedido, {
    nullable: true,
    cascade: true,
    eager: true,
  })
  @JoinColumn({ name: 'transporte_id' }) // Este es el JOIN del pedido con el transporte
  transporte_detalle?: Transporte;
}
