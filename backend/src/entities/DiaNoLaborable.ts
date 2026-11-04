import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Día no laborable (feriado) para el horario de atención y el SLA.
 *
 * - `recurrente_anual = false`: fecha exacta (ej. Carnaval 2026).
 * - `recurrente_anual = true`: se repite cada año comparando mes-día; la
 *   columna `fecha` se guarda con un año de referencia (2000-MM-DD).
 */
@Entity('dias_no_laborables')
export class DiaNoLaborable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  descripcion: string | null;

  @Column({ name: 'recurrente_anual', default: false })
  recurrente_anual: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'fecha_creacion' })
  fecha_creacion: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'fecha_actualizacion' })
  fecha_actualizacion: Date;
}
