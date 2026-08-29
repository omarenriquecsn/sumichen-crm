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

/**
 * Suscripción de Web Push de un usuario (PWA). Cada fila = un dispositivo
 * (teléfono/PC) donde el usuario habilitó las notificaciones del CRM.
 *
 * ⚠ vendedor_id apunta al id de la TABLA vendedores (vendedor_db_id), NO al
 * supabase_id. El backend resuelve el id de tabla desde el JWT en jwtHandler.
 */
@Entity('push_suscripciones')
export class PushSuscripcion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'vendedor_id' })
  vendedor_id: string;

  @ManyToOne(() => Vendedor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vendedor_id' })
  vendedor: Vendedor;

  @Column({ unique: true })
  endpoint: string;

  @Column()
  p256dh: string;

  @Column()
  auth: string;

  @Column({ nullable: true })
  dispositivo: string;

  @CreateDateColumn({ type: 'timestamptz' })
  fecha_creacion: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  fecha_actualizacion: Date;
}
