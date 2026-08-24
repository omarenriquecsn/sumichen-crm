import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Cliente } from './Clientes';
import { Vendedor } from './Vendedores';
import { TipoReunionEnum } from '../enums/TipoReunionEnum';
import { EstadoReunionEnum } from '../enums/EstadoReunionEnum';

@Entity('reuniones')
export class Reunion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'cliente_id' })
  cliente_id: string;

  @ManyToOne(() => Cliente)
  @JoinColumn({ name: 'cliente_id' })
  cliente: Cliente;

  @Column({ name: 'vendedor_id' })
  vendedor_id: string;

  @ManyToOne(() => Vendedor)
  @JoinColumn({ name: 'vendedor_id' })
  vendedor: Vendedor;

  @Column({ type: 'varchar', length: 150 })
  titulo: string;

  @Column()
  descripcion: string;

  @Column({ type: 'timestamptz' })
  fecha_inicio: Date;

  @Column({ type: 'timestamptz' })
  fecha_fin: Date;

  @Column()
  ubicacion: string;

  @Column({
    type: 'enum',
    enum: TipoReunionEnum,
    default: TipoReunionEnum.TELEFONICA,
  })
  tipo: TipoReunionEnum;

  @Column({
    type: 'enum',
    enum: EstadoReunionEnum,
    default: EstadoReunionEnum.PROGRAMADA,
  })
  estado: EstadoReunionEnum;

  @Column({ type: 'boolean', default: false })
  recordatorio: boolean;

  @Column({ nullable: true })
  enlace_reunion?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  fecha_creacion: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  fecha_actualizacion: Date;
}
