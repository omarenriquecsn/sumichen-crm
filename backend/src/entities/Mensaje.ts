import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Conversacion } from './Conversacion';

export enum RemitenteTipoEnum {
  VENDEDOR = 'vendedor',
  LEAD = 'lead',
  SISTEMA = 'sistema',
}

export enum TipoMensajeEnum {
  TEXTO = 'texto',
  IMAGEN = 'imagen',
  DOCUMENTO = 'documento',
  UBICACION = 'ubicacion',
  PLANTILLA = 'plantilla',
}

@Entity('mensajes')
@Index(['conversacion_id'])
@Index(['remitente_tipo'])
@Index(['fecha_creacion'])
export class Mensaje {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'conversacion_id', type: 'uuid' })
  conversacion_id: string;

  @Column({ name: 'remitente_tipo', type: 'enum', enum: RemitenteTipoEnum })
  remitente_tipo: RemitenteTipoEnum;

  @Column({ name: 'remitente_id', type: 'uuid' })
  remitente_id: string;

  @Column({ type: 'text' })
  contenido: string;

  @Column({ type: 'enum', enum: TipoMensajeEnum, default: TipoMensajeEnum.TEXTO })
  tipo: TipoMensajeEnum;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @Column({ name: 'detectado_sin_stock', type: 'boolean', default: false })
  detectado_sin_stock: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'fecha_creacion' })
  fecha_creacion: Date;

  @ManyToOne(() => Conversacion, (c) => c.mensajes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversacion_id' })
  conversacion: Conversacion;
}