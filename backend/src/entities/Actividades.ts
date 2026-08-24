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
import { ActividadesEnum } from '../enums/ActividadesEnum';
import { UUID } from 'typeorm/driver/mongodb/bson.typings';

@Entity('actividades')
export class Actividad {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'cliente_id' })
  cliente_id: string;

  @ManyToOne(() => Cliente, { nullable: false })
  @JoinColumn({ name: 'cliente_id' })
  cliente: Cliente;

  @Column({ name: 'vendedor_id' })
  vendedor_id: string;

  @ManyToOne(() => Vendedor, { nullable: false })
  @JoinColumn({ name: 'vendedor_id' })
  vendedor: Vendedor;

  @Column({
    type: 'enum',
    enum: ActividadesEnum,
    default: ActividadesEnum.LLAMADA,
  })
  tipo: ActividadesEnum;

  @Column({ type: 'varchar', length: 150 })
  titulo: string;

  @Column()
  descripcion: string;

  @Column({ type: 'timestamptz' })
  fecha: Date;

  @Column({ type: 'timestamptz', nullable: true })
  fecha_vencimiento?: Date;

  @Column({ type: 'boolean', default: false })
  completado: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  fecha_creacion: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  fecha_actualizacion: Date;

  @Column({ nullable: true })
  id_tipo_actividad: string;
}
