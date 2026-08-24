import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Vendedor } from './Vendedores';
import { TipoNotificacionEnum } from '../enums/TipoNotificaionEnum';

@Entity('notificaciones')
export class Notificacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'vendedor_id' })
  vendedor_id: string;

  @ManyToOne(() => Vendedor)
  @JoinColumn({ name: 'vendedor_id' })
  vendedor: Vendedor;

  @Column()
  descripcion: string;

  @Column({
    type: 'enum',
    enum: TipoNotificacionEnum,
  })
  tipo: TipoNotificacionEnum;

  @Column({ default: false })
  leida: boolean;


  @CreateDateColumn({ type: 'timestamptz' })
  fecha: Date;
}
