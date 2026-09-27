import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Campaña publicitaria identificada por una palabra clave. El administrador
 * las administra desde el dashboard de marketing; cuando el primer mensaje de
 * un lead de WhatsApp contiene la palabra clave, el lead queda atribuido a esa
 * campaña (`leads.palabra_clave`).
 */
@Entity('campanas')
export class Campana {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  palabra_clave: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  descripcion: string | null;

  @Column({ default: true })
  activa: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  fecha_creacion: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  fecha_actualizacion: Date;
}
