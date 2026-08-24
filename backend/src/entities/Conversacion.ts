import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
  Unique,
} from 'typeorm';
import { Lead } from './Lead';
import { Vendedor } from './Vendedores';
import { Mensaje } from './Mensaje';

export enum EstadoConversacionEnum {
  ABIERTA = 'abierta',
  CERRADA = 'cerrada',
  TRANSFERIDA = 'transferida',
}

export enum CanalConversacionEnum {
  WHATSAPP = 'whatsapp',
  INSTAGRAM = 'instagram',
  WEB_CHAT = 'web_chat',
}

@Entity('conversaciones')
@Unique(['lead_id'])
@Index(['vendedor_id'])
@Index(['estado'])
@Index(['ultimo_mensaje_en'])
export class Conversacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'lead_id', type: 'uuid' })
  lead_id: string;

  @Column({ name: 'vendedor_id', type: 'uuid' })
  vendedor_id: string;

  @Column({ type: 'enum', enum: EstadoConversacionEnum, default: EstadoConversacionEnum.ABIERTA })
  estado: EstadoConversacionEnum;

  @Column({ type: 'enum', enum: CanalConversacionEnum, default: CanalConversacionEnum.WHATSAPP })
  canal: CanalConversacionEnum;

  @Column({ name: 'ultimo_mensaje_en', type: 'timestamptz', nullable: true })
  ultimo_mensaje_en: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'fecha_creacion' })
  fecha_creacion: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'fecha_actualizacion' })
  fecha_actualizacion: Date;

  @ManyToOne(() => Lead, (l) => l.conversaciones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @ManyToOne(() => Vendedor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vendedor_id' })
  vendedor: Vendedor;

  @OneToMany(() => Mensaje, (m) => m.conversacion, { cascade: true })
  mensajes: Mensaje[];
}