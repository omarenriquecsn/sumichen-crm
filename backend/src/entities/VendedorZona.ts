import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { Vendedor } from './Vendedores';
import { Zona } from './Zona';

@Entity('vendedor_zona')
@Unique(['vendedor_id', 'zona_id'])
@Index(['vendedor_id'])
@Index(['zona_id'])
export class VendedorZona {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'vendedor_id', type: 'uuid' })
  vendedor_id: string;

  @Column({ name: 'zona_id', type: 'uuid' })
  zona_id: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'fecha_asignacion' })
  fecha_asignacion: Date;

  @ManyToOne(() => Vendedor, (v) => v.zonas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vendedor_id' })
  vendedor: Vendedor;

  @ManyToOne(() => Zona, (z) => z.vendedores, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'zona_id' })
  zona: Zona;
}