import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'productos' })
export class Producto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  nombre: string;

  @Column()
  descripcion: string;

  @Column({ type: 'varchar' })
  unidad_medida: string;

  @Column({ type: 'decimal', precision: 12, scale: 4, default: 0 })
  precio_base: number;

  @Column({ type: 'boolean', default: true })
  disponible: boolean;
}
