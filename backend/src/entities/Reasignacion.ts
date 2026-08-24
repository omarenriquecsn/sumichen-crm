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

export enum MotivoReasignacionEnum {
  SLA_VENCIDO = 'sla_vencido',
  MANUAL_ADMIN = 'manual_admin',
  VENDEDOR_INACTIVO = 'vendedor_inactivo',
  SIN_VENDEDOR_ZONA = 'sin_vendedor_zona',
}

@Entity('reasignaciones')
@Index(['lead_id'])
@Index(['vendedor_anterior_id'])
@Index(['vendedor_nuevo_id'])
@Index(['motivo'])
@Index(['fecha'])
export class Reasignacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'lead_id', type: 'uuid' })
  lead_id: string;

  @Column({ name: 'vendedor_anterior_id', type: 'uuid', nullable: true })
  vendedor_anterior_id: string | null;

  @Column({ name: 'vendedor_nuevo_id', type: 'uuid', nullable: true })
  vendedor_nuevo_id: string | null;

  @Column({ type: 'enum', enum: MotivoReasignacionEnum })
  motivo: MotivoReasignacionEnum;

  @CreateDateColumn({ type: 'timestamptz', name: 'fecha' })
  fecha: Date;

  @ManyToOne(() => Lead, (l) => l.reasignaciones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @ManyToOne(() => Vendedor, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'vendedor_anterior_id' })
  vendedor_anterior: Vendedor | null;

  @ManyToOne(() => Vendedor, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'vendedor_nuevo_id' })
  vendedor_nuevo: Vendedor | null;
}