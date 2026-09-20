import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TipoInstrumento } from './TipoInstrumento';
import { AlmacenEnum } from '../enums/AlmacenEnum';

/**
 * Existencias de un tipo de instrumento en un almacén.
 * - `cantidad_total`: unidades en circulación (almacén + tránsito + cliente).
 * - `cantidad_disponible`: unidades físicas en el almacén.
 * Donado/dañado se descuentan de `cantidad_total`.
 */
@Entity({ name: 'instrumento_stock' })
export class InstrumentoStock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tipo_instrumento_id' })
  tipo_instrumento_id: string;

  @ManyToOne(() => TipoInstrumento, { nullable: false })
  @JoinColumn({ name: 'tipo_instrumento_id' })
  tipo_instrumento: TipoInstrumento;

  @Column({ type: 'enum', enum: AlmacenEnum, enumName: 'almacen_enum' })
  almacen: AlmacenEnum;

  @Column({
    name: 'cantidad_total',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  cantidad_total: number;

  @Column({
    name: 'cantidad_disponible',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  cantidad_disponible: number;
}
