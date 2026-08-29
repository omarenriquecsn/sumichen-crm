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
 * Preferencia de notificación push por evento de un usuario (PWA).
 * Cada fila = (vendedor, evento) con `habilitado`. Si no existe fila para un
 * evento, se asume habilitado (default true).
 *
 * ⚠ vendedor_id apunta al id de la TABLA vendedores (vendedor_db_id), NO al
 * supabase_id (igual que push_suscripciones).
 */
@Entity('preferencias_notificaciones')
export class PreferenciaNotificacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'vendedor_id' })
  vendedor_id: string;

  @ManyToOne(() => Vendedor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vendedor_id' })
  vendedor: Vendedor;

  @Column({ length: 40 })
  evento: string;

  @Column({ type: 'boolean', default: true })
  habilitado: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  fecha_creacion: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  fecha_actualizacion: Date;
}
