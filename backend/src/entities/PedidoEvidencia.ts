import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Pedido } from './Pedidos';
import { Vendedor } from './Vendedores';

/**
 * Evidencia (archivo adjunto) de un pedido. Un pedido puede tener varias.
 * Se guarda el archivo ORIGINAL (imagen, PDF, Excel, Word, etc.) sin convertirlo,
 * en disco (`EVIDENCIA_UPLOAD_PATH`), y aquí solo su metadata + URL.
 */
@Entity('pedido_evidencias')
export class PedidoEvidencia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'pedido_id', type: 'uuid' })
  pedido_id: string;

  @ManyToOne(() => Pedido, (pedido) => pedido.evidencias, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'pedido_id' })
  pedido: Pedido;

  @Column({ name: 'nombre_original', type: 'text' })
  nombre_original: string;

  @Column({ name: 'archivo_nombre', type: 'text' })
  archivo_nombre: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  mime?: string | null;

  @Column({ type: 'integer', nullable: true })
  tamano?: number | null;

  @Column({ type: 'text' })
  url: string;

  @Column({ name: 'subido_por_id', type: 'uuid', nullable: true })
  subido_por_id?: string | null;

  @ManyToOne(() => Vendedor, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'subido_por_id' })
  subido_por?: Vendedor;

  @CreateDateColumn({ type: 'timestamptz' })
  fecha_creacion: Date;
}
