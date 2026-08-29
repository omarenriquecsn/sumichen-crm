import 'reflect-metadata';
import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import { Vendedor } from '../entities/Vendedores';
import { Ticket } from '../entities/Tickets';
import { Actividad } from '../entities/Actividades';
import { Reunion } from '../entities/Reuniones';
import { Oportunidad } from '../entities/Oportunidades';
import { Pedido } from '../entities/Pedidos';
import { Producto } from '../entities/Productos';
import { ProductosPedido } from '../entities/Productos_pedido';
import { Meta } from '../entities/Metas';
import { Cliente } from '../entities/Clientes';
import { Notificacion } from '../entities/Notificaciones';
import { Zona } from '../entities/Zona';
import { VendedorZona } from '../entities/VendedorZona';
import { Lead } from '../entities/Lead';
import { Reasignacion } from '../entities/Reasignacion';
import { Conversacion } from '../entities/Conversacion';
import { Mensaje } from '../entities/Mensaje';
import { MenuBienvenida } from '../entities/MenuBienvenida';
import { Transporte } from '../entities/Transporte';
import { PushSuscripcion } from '../entities/PushSuscripcion';
import { CredencialBiometrica } from '../entities/CredencialBiometrica';
dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: false,
  migrationsRun: process.env.RUN_MIGRATIONS !== 'false',
  logging: true,
  entities: [
    Vendedor,
    Ticket,
    Actividad,
    Reunion,
    Oportunidad,
    Pedido,
    Producto,
    ProductosPedido,
    Meta,
    Cliente,
    Notificacion,
    Zona,
    VendedorZona,
    Lead,
    Reasignacion,
    Conversacion,
    Mensaje,
    MenuBienvenida,
    Transporte,
    PushSuscripcion,
    CredencialBiometrica,
  ],
  migrations: ['build/database/migrations/**/*.js'],
  dropSchema: false,
});
