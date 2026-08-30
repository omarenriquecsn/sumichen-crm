import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export interface OpcionIntencion {
  numero: number;
  etiqueta: string;
  tipo_web: 'cotizacion' | 'informacion' | 'soporte' | 'catalogo';
}

@Entity('menu_bienvenida')
export class MenuBienvenida {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: true })
  activo: boolean;

  @Column({ type: 'text', default: '¡Hola {nombre}! Gracias por escribir a Sumichem. Para atenderte mejor necesitamos saber tu ubicación.' })
  mensaje_bienvenida: string;

  @Column({ type: 'text', default: '¿De qué estado nos escribes? Responde con el número:\n{opciones}' })
  pregunta_estado: string;

  @Column({ type: 'text', default: 'Gracias por tu información, {nombre}. Un asesor te contactará muy pronto.' })
  mensaje_sin_vendedor: string;

  @Column({ type: 'text', default: '{vendedor} de la zona {zona} te atenderá. ¿Qué necesitas?\n{opciones}' })
  pregunta_intencion: string;

  @Column({ type: 'text', default: '¡Listo, {nombre}! {vendedor} ({telefono_vendedor}) te contactará por este medio.' })
  mensaje_confirmacion: string;

  @Column({ type: 'text', default: '¡Hola {nombre}! ¿Cómo podemos ayudarte?\n{opciones}' })
  mensaje_tipo_contacto: string;

  @Column({ type: 'uuid', nullable: true })
  vendedor_proveedores_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  vendedor_trabajo_id: string | null;

  @Column({ type: 'text', default: 'Gracias {nombre}. {vendedor} se comunicará contigo por este medio.' })
  mensaje_proveedor: string;

  @Column({ type: 'text', default: 'Gracias {nombre}. {vendedor} se comunicará contigo por este medio.' })
  mensaje_trabajo: string;

  @Column({ type: 'jsonb', default: () => `'[{"numero":1,"etiqueta":"Cotización","tipo_web":"cotizacion"},{"numero":2,"etiqueta":"Catálogo","tipo_web":"catalogo"}]'` })
  opciones_intencion: OpcionIntencion[];

  @CreateDateColumn({ type: 'timestamptz' })
  fecha_creacion: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  fecha_actualizacion: Date;
}
