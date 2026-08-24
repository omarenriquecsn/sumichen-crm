import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Pedido } from "./Pedidos";

@Entity('transporte')
export class Transporte {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({name: 'nombre', type: 'varchar', length: 100})
    nombre: string;

    @Column({name: 'cedula',  type: 'varchar', length: 50})
    cedula: string;

    @Column({name: 'marca',  type: 'varchar', length: 100})
    marca: string;

    @Column({name: 'modelo',  type: 'varchar', length: 100})
    modelo: string;

    @Column({name: 'placa',  type: 'varchar', length: 50})
    placa: string;

    @OneToOne(() => Pedido, (pedido) => pedido.transporte_detalle)
    pedido: Pedido;
}
