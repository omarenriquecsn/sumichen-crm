import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Lead } from './Lead';
import { Vendedor } from './Vendedores';

/**
 * Nota del diario de negociación de un lead. Cada entrada es inmutable en su
 * fecha/autor y registra el progreso de la gestión (por qué no se cerró, si
 * hubo interés, acuerdos, etc.).
 */
@Entity('lead_notas')
@Index(['lead_id', 'fecha_creacion'])
export class LeadNota {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'lead_id', type: 'uuid' })
  lead_id: string;

  @Column({ name: 'vendedor_id', type: 'uuid', nullable: true })
  vendedor_id: string | null;

  @Column({ type: 'text' })
  contenido: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'fecha_creacion' })
  fecha_creacion: Date;

  @ManyToOne(() => Lead, (lead) => lead.notas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @ManyToOne(() => Vendedor, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'vendedor_id' })
  vendedor: Vendedor | null;
}
