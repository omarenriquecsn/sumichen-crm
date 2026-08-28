import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Vendedor } from './Vendedores';
import { Cliente } from './Clientes';
import { Zona } from './Zona';
import { Reasignacion } from './Reasignacion';
import { Conversacion } from './Conversacion';

export enum OrigenLeadEnum {
  INSTAGRAM = 'instagram',
  WEB = 'web',
  WHATSAPP = 'whatsapp',
}

export enum TipoWebEnum {
  COTIZACION = 'cotizacion',
  INFORMACION = 'informacion',
  SOPORTE = 'soporte',
  CATALOGO = 'catalogo',
}

export enum CanalEntradaEnum {
  INSTAGRAM_BOTON = 'instagram_boton',
  WEB_FORMULARIO = 'web_formulario',
  WHATSAPP_MENSAJE = 'whatsapp_mensaje',
}

export enum EstadoLeadEnum {
  NUEVO = 'nuevo',
  ASIGNADO = 'asignado',
  CONTACTADO = 'contactado',
  CALIFICADO = 'calificado',
  CONVERTIDO = 'convertido',
  PERDIDO = 'perdido',
  REASIGNADO = 'reasignado',
}

@Entity('leads')
@Index(['vendedor_asignado_id'])
@Index(['zona_id'])
@Index(['estado'])
@Index(['origen'])
@Index(['fecha_creacion'])
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: OrigenLeadEnum })
  origen: OrigenLeadEnum;

  @Column({ type: 'enum', enum: TipoWebEnum, nullable: true })
  tipo_web: TipoWebEnum | null;

  @Column({ type: 'enum', enum: CanalEntradaEnum })
  canal_entrada: CanalEntradaEnum;

  @Column({ name: 'zona_id', type: 'uuid', nullable: true })
  zona_id: string | null;

  @Column({ type: 'enum', enum: EstadoLeadEnum, default: EstadoLeadEnum.NUEVO })
  estado: EstadoLeadEnum;

  @Column({ name: 'vendedor_asignado_id', type: 'uuid', nullable: true })
  vendedor_asignado_id: string | null;

  @Column({ name: 'cliente_id', type: 'uuid', nullable: true })
  cliente_id: string | null;

  @Column({ name: 'datos_contacto', type: 'jsonb' })
  datos_contacto: {
    nombre: string;
    apellido?: string;
    telefono: string;
    email?: string;
    instagram_handle?: string;
    mensaje_inicial: string;
  };

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @Column({ name: 'asignado_en', type: 'timestamptz', nullable: true })
  asignado_en: Date | null;

  @Column({ name: 'ultima_actividad_en', type: 'timestamptz', nullable: true })
  ultima_actividad_en: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'fecha_creacion' })
  fecha_creacion: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'fecha_actualizacion' })
  fecha_actualizacion: Date;

  @ManyToOne(() => Vendedor, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'vendedor_asignado_id' })
  vendedor_asignado: Vendedor | null;

  @ManyToOne(() => Cliente, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'cliente_id' })
  cliente: Cliente | null;

  @ManyToOne(() => Zona, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'zona_id' })
  zona: Zona | null;

  @OneToMany(() => Reasignacion, (r) => r.lead)
  reasignaciones: Reasignacion[];

  @OneToMany(() => Conversacion, (c) => c.lead)
  conversaciones: Conversacion[];
}