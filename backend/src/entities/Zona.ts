import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { VendedorZona } from './VendedorZona';

@Entity('zonas')
export class Zona {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100, unique: true })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ type: 'jsonb', default: () => `'[]'` })
  estados: string[];

  @Column({ default: true })
  activa: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  fecha_creacion: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  fecha_actualizacion: Date;

  @OneToMany(() => VendedorZona, (vz) => vz.zona)
  vendedores: VendedorZona[];
}