import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Credencial WebAuthn (passkey / huella) de un usuario.
 *
 * ⚠ `supabase_id` = el `auth.users.id` de Supabase (coincide con
 * `vendedores.supabase_id`), NO con el id de la tabla `vendedores`. Se usa el
 * supabase_id porque el login biométrico ocurre ANTES de tener una sesión.
 */
@Entity('credenciales_biometricas')
export class CredencialBiometrica {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'supabase_id' })
  supabase_id: string;

  @Column({ name: 'credential_id', unique: true })
  credential_id: string;

  @Column({ name: 'public_key' })
  public_key: string;

  @Column({ type: 'int', default: 0 })
  counter: number;

  @Column({ nullable: true })
  dispositivo: string;

  @CreateDateColumn({ type: 'timestamptz' })
  fecha_creacion: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  fecha_actualizacion: Date;
}
