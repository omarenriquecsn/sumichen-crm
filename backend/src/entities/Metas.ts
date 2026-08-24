import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Vendedor } from './Vendedores';

@Entity('metas')
export class Meta {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'vendedor_id' })
  vendedor_id: string;

  @ManyToOne(() => Vendedor, { nullable: false })
  @JoinColumn({ name: 'vendedor_id' })
  vendedor: Vendedor;

  @Column({ type: 'text' })
  mes: string;

  @Column({ type: 'int' })
  ano: number;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  objetivo_ventas: number;

  @Column({ type: 'int' })
  objetivo_clientes: number;


  @Column({ type: 'int', default: 0 })
  emails: number;

  @Column({ type: 'int', default: 0 })
  tareas: number;

  @Column({ type: 'int', default: 0 })
  llamadas: number;

  @Column({ type: 'int', default: 0 })
  reuniones: number;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'now()' })
  fecha_creacion: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'now()' })
  fecha_actualizacion: Date;
}
