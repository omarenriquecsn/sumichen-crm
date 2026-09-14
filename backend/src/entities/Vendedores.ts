import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { RolesEnum } from '../enums/RolesEnum';
import { VendedorZona } from './VendedorZona';

@Entity({ name: 'vendedores' })
export class Vendedor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  supabase_id: string;

  @Column()
  nombre: string;

  @Column()
  apellido: string;

  // type explícito: `string | null` reflejaría design:type Object y rompería
  // TypeORM ("Data type Object not supported"). varchar coincide con el baseline.
  @Column({ type: 'varchar', nullable: true })
  telefono?: string | null;

  @Column({ type: 'enum', enum: RolesEnum, default: RolesEnum.VENDEDOR })
  rol: RolesEnum;

  @Column({ type: 'boolean', default: true })
  activo?: boolean;

  @Column({ nullable: true, default: 0 })
  meta_mensual_ventas?: number;

  @Column({ nullable: true, default: 0 })
  meta_mensual_clientes?: number;

  // Rutas del menú lateral que el usuario decidió OCULTAR en su sidebar
  // (default [] = todo visible). Se gestiona desde Configuración → Sidebar.
  @Column({ type: 'jsonb', nullable: false, default: () => "'[]'::jsonb" })
  sidebar_oculto: string[];

   @Column({ nullable: true, default: 0 })
  monto_negociacion_mes?: number;

  // Imagen/firma única del vendedor (subida desde Configuración → Perfil). Se usa
  // como pie de página en el correo que se envía al cliente. URL absoluta.
  @Column({ type: 'varchar', nullable: true })
  firma_url?: string | null;

  // ── Gmail OAuth2 (correo propio del vendedor) ─────────────────────────────
  // Cuenta de Google conectada desde Configuración → Perfil. Los correos que
  // envía el vendedor salen desde esta cuenta y quedan en su carpeta "Enviados".
  @Column({ type: 'varchar', nullable: true })
  google_email?: string | null;

  // Tokens OAuth2. `select: false` evita que se serialicen en las respuestas de
  // la API (GET /usuarios y GET /usuarios/:id devuelven la entidad completa):
  // solo se leen explícitamente para enviar correo. NUNCA deben exponerse.
  @Column({ type: 'text', nullable: true, select: false })
  google_refresh_token?: string | null;

  @Column({ type: 'text', nullable: true, select: false })
  google_access_token?: string | null;

  @Column({ type: 'timestamptz', nullable: true, select: false })
  google_token_expiry?: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  fecha_creacion?: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  fecha_actualizacion?: Date;

  @OneToMany(() => VendedorZona, (vz) => vz.vendedor)
  zonas: VendedorZona[];
}
