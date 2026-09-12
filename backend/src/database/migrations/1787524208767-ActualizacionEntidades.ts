import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migración de actualización de entidades (endurecida).
 *
 * ⚠ Originalmente generada por TypeORM sin guardas. Se endureció para que
 * pueda ejecutarse sobre una base de datos legacy (creada con `synchronize`,
 * sin tabla `migrations`) sin abortar:
 * - Todos los `DROP CONSTRAINT` / `DROP INDEX` usan `IF EXISTS`.
 * - Los `ADD COLUMN` usan `IF NOT EXISTS`.
 * - Los `CREATE INDEX` usan `IF NOT EXISTS` y los `ADD CONSTRAINT` van
 *   protegidos con un bloque `DO $$` que revisa `pg_constraint`.
 * - Los `SET DEFAULT` de `clientes.fecha_creacion` / `fecha_actualizacion`
 *   usaban un literal entrecomillado inválido para `date`; ahora usan `now()`.
 */
export class ActualizacionEntidades1787524208767 implements MigrationInterface {
    name = 'ActualizacionEntidades1787524208767'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // ===== DROP de constraints e índices creados por MarketingLeadsSchema =====
        const drops: string[] = [
            `ALTER TABLE "vendedor_zona" DROP CONSTRAINT IF EXISTS "vendedor_zona_vendedor_id_fkey"`,
            `ALTER TABLE "vendedor_zona" DROP CONSTRAINT IF EXISTS "vendedor_zona_zona_id_fkey"`,
            `ALTER TABLE "reasignaciones" DROP CONSTRAINT IF EXISTS "reasignaciones_lead_id_fkey"`,
            `ALTER TABLE "reasignaciones" DROP CONSTRAINT IF EXISTS "reasignaciones_vendedor_anterior_id_fkey"`,
            `ALTER TABLE "reasignaciones" DROP CONSTRAINT IF EXISTS "reasignaciones_vendedor_nuevo_id_fkey"`,
            `ALTER TABLE "mensajes" DROP CONSTRAINT IF EXISTS "mensajes_conversacion_id_fkey"`,
            `ALTER TABLE "conversaciones" DROP CONSTRAINT IF EXISTS "conversaciones_lead_id_fkey"`,
            `ALTER TABLE "conversaciones" DROP CONSTRAINT IF EXISTS "conversaciones_vendedor_id_fkey"`,
            `ALTER TABLE "leads" DROP CONSTRAINT IF EXISTS "leads_zona_id_fkey"`,
            `ALTER TABLE "leads" DROP CONSTRAINT IF EXISTS "leads_vendedor_asignado_id_fkey"`,
            `ALTER TABLE "leads" DROP CONSTRAINT IF EXISTS "leads_cliente_id_fkey"`,
            `DROP INDEX IF EXISTS "public"."idx_vendedor_zona_vendedor_id"`,
            `DROP INDEX IF EXISTS "public"."idx_vendedor_zona_zona_id"`,
            `DROP INDEX IF EXISTS "public"."idx_clientes_vendedor_id"`,
            `DROP INDEX IF EXISTS "public"."idx_clientes_estado"`,
            `DROP INDEX IF EXISTS "public"."idx_tickets_vendedor_id"`,
            `DROP INDEX IF EXISTS "public"."idx_actividades_cliente_id"`,
            `DROP INDEX IF EXISTS "public"."idx_actividades_vendedor_id"`,
            `DROP INDEX IF EXISTS "public"."idx_reuniones_vendedor_id"`,
            `DROP INDEX IF EXISTS "public"."idx_oportunidades_vendedor_id"`,
            `DROP INDEX IF EXISTS "public"."idx_pedidos_vendedor_id"`,
            `DROP INDEX IF EXISTS "public"."idx_metas_vendedor_id"`,
            `DROP INDEX IF EXISTS "public"."idx_notificaciones_vendedor_id"`,
            `DROP INDEX IF EXISTS "public"."idx_reasignaciones_lead_id"`,
            `DROP INDEX IF EXISTS "public"."idx_reasignaciones_vendedor_anterior_id"`,
            `DROP INDEX IF EXISTS "public"."idx_reasignaciones_vendedor_nuevo_id"`,
            `DROP INDEX IF EXISTS "public"."idx_reasignaciones_motivo"`,
            `DROP INDEX IF EXISTS "public"."idx_reasignaciones_fecha"`,
            `DROP INDEX IF EXISTS "public"."idx_mensajes_conversacion_id"`,
            `DROP INDEX IF EXISTS "public"."idx_mensajes_remitente_tipo"`,
            `DROP INDEX IF EXISTS "public"."idx_mensajes_fecha_creacion"`,
            `DROP INDEX IF EXISTS "public"."idx_conversaciones_vendedor_id"`,
            `DROP INDEX IF EXISTS "public"."idx_conversaciones_estado"`,
            `DROP INDEX IF EXISTS "public"."idx_conversaciones_ultimo_mensaje_en"`,
            `DROP INDEX IF EXISTS "public"."idx_leads_vendedor_asignado_id"`,
            `DROP INDEX IF EXISTS "public"."idx_leads_zona_id"`,
            `DROP INDEX IF EXISTS "public"."idx_leads_estado"`,
            `DROP INDEX IF EXISTS "public"."idx_leads_origen"`,
            `DROP INDEX IF EXISTS "public"."idx_leads_fecha_creacion"`,
            `ALTER TABLE "vendedor_zona" DROP CONSTRAINT IF EXISTS "uq_vendedor_zona"`,
        ];
        for (const sql of drops) {
            await queryRunner.query(sql);
        }

        // ===== Columnas nuevas =====
        await queryRunner.query(`ALTER TABLE "productos_pedido" ADD COLUMN IF NOT EXISTS "precio_base" numeric(12,4) NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "productos_pedido" ADD COLUMN IF NOT EXISTS "porcentaje_negociacion" numeric(12,4) NOT NULL DEFAULT 0`);

        // ===== Defaults (corregidos: antes eran un literal entrecomillado inválido) =====
        await queryRunner.query(`ALTER TABLE "clientes" ALTER COLUMN "fecha_creacion" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "clientes" ALTER COLUMN "fecha_actualizacion" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "menu_bienvenida" ALTER COLUMN "opciones_intencion" SET DEFAULT '[{"numero":1,"etiqueta":"Cotización","tipo_web":"cotizacion"},{"numero":2,"etiqueta":"Información","tipo_web":"informacion"},{"numero":3,"etiqueta":"Soporte","tipo_web":"soporte"}]'`);

        // ===== Índices y constraints (idempotentes) =====
        const guards: string[] = [
            `CREATE INDEX IF NOT EXISTS "IDX_034dd9bb7a46df6d4c77e0b2d2" ON "vendedor_zona" ("zona_id")`,
            `CREATE INDEX IF NOT EXISTS "IDX_bec16e7acc0c00c26700d375b0" ON "vendedor_zona" ("vendedor_id")`,
            `CREATE INDEX IF NOT EXISTS "IDX_42eef3829fe6d1c1b0e27778f7" ON "reasignaciones" ("fecha")`,
            `CREATE INDEX IF NOT EXISTS "IDX_062d39bfdefed11b470d99b0ee" ON "reasignaciones" ("motivo")`,
            `CREATE INDEX IF NOT EXISTS "IDX_44d1e7185568f2e92b1da5ebfd" ON "reasignaciones" ("vendedor_nuevo_id")`,
            `CREATE INDEX IF NOT EXISTS "IDX_8eb640876790b2abe7bc6c7bf3" ON "reasignaciones" ("vendedor_anterior_id")`,
            `CREATE INDEX IF NOT EXISTS "IDX_6088bccede9d14c13d06bb5812" ON "reasignaciones" ("lead_id")`,
            `CREATE INDEX IF NOT EXISTS "IDX_0c6dd0f734cf96140048099cd8" ON "mensajes" ("fecha_creacion")`,
            `CREATE INDEX IF NOT EXISTS "IDX_9842cae63259de4c293afa5e64" ON "mensajes" ("remitente_tipo")`,
            `CREATE INDEX IF NOT EXISTS "IDX_7f8b407efa1135b971fdd05c07" ON "mensajes" ("conversacion_id")`,
            `CREATE INDEX IF NOT EXISTS "IDX_7ac0d03cb2185c8bfe06d9f6c0" ON "conversaciones" ("ultimo_mensaje_en")`,
            `CREATE INDEX IF NOT EXISTS "IDX_a6eb19dacc9f5f2c7b916c6227" ON "conversaciones" ("estado")`,
            `CREATE INDEX IF NOT EXISTS "IDX_8cf2b1abb78f953a04935a4996" ON "conversaciones" ("vendedor_id")`,
            `CREATE INDEX IF NOT EXISTS "IDX_e0a671137d75b46520dfcb8797" ON "leads" ("fecha_creacion")`,
            `CREATE INDEX IF NOT EXISTS "IDX_6e97e05e19f2fb9e3c3186c292" ON "leads" ("origen")`,
            `CREATE INDEX IF NOT EXISTS "IDX_0e991b4928c09964472e68f6f9" ON "leads" ("estado")`,
            `CREATE INDEX IF NOT EXISTS "IDX_6cd614ca489dc09cfbc3a383be" ON "leads" ("zona_id")`,
            `CREATE INDEX IF NOT EXISTS "IDX_a3147e74319e032452b68a791f" ON "leads" ("vendedor_asignado_id")`,
            `DO $$ BEGIN
               IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UQ_5379b20a37dfbe375ccba18b4e2') THEN
                 ALTER TABLE "vendedor_zona" ADD CONSTRAINT "UQ_5379b20a37dfbe375ccba18b4e2" UNIQUE ("vendedor_id", "zona_id");
               END IF;
             END $$;`,
            `DO $$ BEGIN
               IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_bec16e7acc0c00c26700d375b08') THEN
                 ALTER TABLE "vendedor_zona" ADD CONSTRAINT "FK_bec16e7acc0c00c26700d375b08" FOREIGN KEY ("vendedor_id") REFERENCES "vendedores"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
               END IF;
             END $$;`,
            `DO $$ BEGIN
               IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_034dd9bb7a46df6d4c77e0b2d29') THEN
                 ALTER TABLE "vendedor_zona" ADD CONSTRAINT "FK_034dd9bb7a46df6d4c77e0b2d29" FOREIGN KEY ("zona_id") REFERENCES "zonas"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
               END IF;
             END $$;`,
            `DO $$ BEGIN
               IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_6088bccede9d14c13d06bb5812e') THEN
                 ALTER TABLE "reasignaciones" ADD CONSTRAINT "FK_6088bccede9d14c13d06bb5812e" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
               END IF;
             END $$;`,
            `DO $$ BEGIN
               IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_8eb640876790b2abe7bc6c7bf38') THEN
                 ALTER TABLE "reasignaciones" ADD CONSTRAINT "FK_8eb640876790b2abe7bc6c7bf38" FOREIGN KEY ("vendedor_anterior_id") REFERENCES "vendedores"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
               END IF;
             END $$;`,
            `DO $$ BEGIN
               IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_44d1e7185568f2e92b1da5ebfd8') THEN
                 ALTER TABLE "reasignaciones" ADD CONSTRAINT "FK_44d1e7185568f2e92b1da5ebfd8" FOREIGN KEY ("vendedor_nuevo_id") REFERENCES "vendedores"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
               END IF;
             END $$;`,
            `DO $$ BEGIN
               IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_7f8b407efa1135b971fdd05c079') THEN
                 ALTER TABLE "mensajes" ADD CONSTRAINT "FK_7f8b407efa1135b971fdd05c079" FOREIGN KEY ("conversacion_id") REFERENCES "conversaciones"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
               END IF;
             END $$;`,
            `DO $$ BEGIN
               IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_90aeb9b13c137e30a7e03b82483') THEN
                 ALTER TABLE "conversaciones" ADD CONSTRAINT "FK_90aeb9b13c137e30a7e03b82483" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
               END IF;
             END $$;`,
            `DO $$ BEGIN
               IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_8cf2b1abb78f953a04935a49964') THEN
                 ALTER TABLE "conversaciones" ADD CONSTRAINT "FK_8cf2b1abb78f953a04935a49964" FOREIGN KEY ("vendedor_id") REFERENCES "vendedores"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
               END IF;
             END $$;`,
            `DO $$ BEGIN
               IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_a3147e74319e032452b68a791fe') THEN
                 ALTER TABLE "leads" ADD CONSTRAINT "FK_a3147e74319e032452b68a791fe" FOREIGN KEY ("vendedor_asignado_id") REFERENCES "vendedores"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
               END IF;
             END $$;`,
            `DO $$ BEGIN
               IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_7a2141de6b4909386c64e582ab2') THEN
                 ALTER TABLE "leads" ADD CONSTRAINT "FK_7a2141de6b4909386c64e582ab2" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
               END IF;
             END $$;`,
            `DO $$ BEGIN
               IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_6cd614ca489dc09cfbc3a383beb') THEN
                 ALTER TABLE "leads" ADD CONSTRAINT "FK_6cd614ca489dc09cfbc3a383beb" FOREIGN KEY ("zona_id") REFERENCES "zonas"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
               END IF;
             END $$;`,
        ];
        for (const sql of guards) {
            await queryRunner.query(sql);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const drops: string[] = [
            `ALTER TABLE "leads" DROP CONSTRAINT IF EXISTS "FK_6cd614ca489dc09cfbc3a383beb"`,
            `ALTER TABLE "leads" DROP CONSTRAINT IF EXISTS "FK_7a2141de6b4909386c64e582ab2"`,
            `ALTER TABLE "leads" DROP CONSTRAINT IF EXISTS "FK_a3147e74319e032452b68a791fe"`,
            `ALTER TABLE "conversaciones" DROP CONSTRAINT IF EXISTS "FK_8cf2b1abb78f953a04935a49964"`,
            `ALTER TABLE "conversaciones" DROP CONSTRAINT IF EXISTS "FK_90aeb9b13c137e30a7e03b82483"`,
            `ALTER TABLE "mensajes" DROP CONSTRAINT IF EXISTS "FK_7f8b407efa1135b971fdd05c079"`,
            `ALTER TABLE "reasignaciones" DROP CONSTRAINT IF EXISTS "FK_44d1e7185568f2e92b1da5ebfd8"`,
            `ALTER TABLE "reasignaciones" DROP CONSTRAINT IF EXISTS "FK_8eb640876790b2abe7bc6c7bf38"`,
            `ALTER TABLE "reasignaciones" DROP CONSTRAINT IF EXISTS "FK_6088bccede9d14c13d06bb5812e"`,
            `ALTER TABLE "vendedor_zona" DROP CONSTRAINT IF EXISTS "FK_034dd9bb7a46df6d4c77e0b2d29"`,
            `ALTER TABLE "vendedor_zona" DROP CONSTRAINT IF EXISTS "FK_bec16e7acc0c00c26700d375b08"`,
            `ALTER TABLE "vendedor_zona" DROP CONSTRAINT IF EXISTS "UQ_5379b20a37dfbe375ccba18b4e2"`,
            `DROP INDEX IF EXISTS "public"."IDX_a3147e74319e032452b68a791f"`,
            `DROP INDEX IF EXISTS "public"."IDX_6cd614ca489dc09cfbc3a383be"`,
            `DROP INDEX IF EXISTS "public"."IDX_0e991b4928c09964472e68f6f9"`,
            `DROP INDEX IF EXISTS "public"."IDX_6e97e05e19f2fb9e3c3186c292"`,
            `DROP INDEX IF EXISTS "public"."IDX_e0a671137d75b46520dfcb8797"`,
            `DROP INDEX IF EXISTS "public"."IDX_8cf2b1abb78f953a04935a4996"`,
            `DROP INDEX IF EXISTS "public"."IDX_a6eb19dacc9f5f2c7b916c6227"`,
            `DROP INDEX IF EXISTS "public"."IDX_7ac0d03cb2185c8bfe06d9f6c0"`,
            `DROP INDEX IF EXISTS "public"."IDX_7f8b407efa1135b971fdd05c07"`,
            `DROP INDEX IF EXISTS "public"."IDX_9842cae63259de4c293afa5e64"`,
            `DROP INDEX IF EXISTS "public"."IDX_0c6dd0f734cf96140048099cd8"`,
            `DROP INDEX IF EXISTS "public"."IDX_6088bccede9d14c13d06bb5812"`,
            `DROP INDEX IF EXISTS "public"."IDX_8eb640876790b2abe7bc6c7bf3"`,
            `DROP INDEX IF EXISTS "public"."IDX_44d1e7185568f2e92b1da5ebfd"`,
            `DROP INDEX IF EXISTS "public"."IDX_062d39bfdefed11b470d99b0ee"`,
            `DROP INDEX IF EXISTS "public"."IDX_42eef3829fe6d1c1b0e27778f7"`,
            `DROP INDEX IF EXISTS "public"."IDX_bec16e7acc0c00c26700d375b0"`,
            `DROP INDEX IF EXISTS "public"."IDX_034dd9bb7a46df6d4c77e0b2d2"`,
            `ALTER TABLE "menu_bienvenida" ALTER COLUMN "opciones_intencion" SET DEFAULT '[{"numero": 1, "etiqueta": "Cotización", "tipo_web": "cotizacion"}, {"numero": 2, "etiqueta": "Información", "tipo_web": "informacion"}, {"numero": 3, "etiqueta": "Soporte", "tipo_web": "soporte"}]'`,
            `ALTER TABLE "clientes" ALTER COLUMN "fecha_actualizacion" SET DEFAULT now()`,
            `ALTER TABLE "clientes" ALTER COLUMN "fecha_creacion" SET DEFAULT now()`,
            `ALTER TABLE "productos_pedido" DROP COLUMN IF EXISTS "porcentaje_negociacion"`,
            `ALTER TABLE "productos_pedido" DROP COLUMN IF EXISTS "precio_base"`,
        ];
        for (const sql of drops) {
            await queryRunner.query(sql);
        }

        const guards: string[] = [
            `DO $$ BEGIN
               IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_vendedor_zona') THEN
                 ALTER TABLE "vendedor_zona" ADD CONSTRAINT "uq_vendedor_zona" UNIQUE ("vendedor_id", "zona_id");
               END IF;
             END $$;`,
            `CREATE INDEX IF NOT EXISTS "idx_leads_fecha_creacion" ON "leads" ("fecha_creacion")`,
            `CREATE INDEX IF NOT EXISTS "idx_leads_origen" ON "leads" ("origen")`,
            `CREATE INDEX IF NOT EXISTS "idx_leads_estado" ON "leads" ("estado")`,
            `CREATE INDEX IF NOT EXISTS "idx_leads_zona_id" ON "leads" ("zona_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_leads_vendedor_asignado_id" ON "leads" ("vendedor_asignado_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_conversaciones_ultimo_mensaje_en" ON "conversaciones" ("ultimo_mensaje_en")`,
            `CREATE INDEX IF NOT EXISTS "idx_conversaciones_estado" ON "conversaciones" ("estado")`,
            `CREATE INDEX IF NOT EXISTS "idx_conversaciones_vendedor_id" ON "conversaciones" ("vendedor_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_mensajes_fecha_creacion" ON "mensajes" ("fecha_creacion")`,
            `CREATE INDEX IF NOT EXISTS "idx_mensajes_remitente_tipo" ON "mensajes" ("remitente_tipo")`,
            `CREATE INDEX IF NOT EXISTS "idx_mensajes_conversacion_id" ON "mensajes" ("conversacion_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_reasignaciones_fecha" ON "reasignaciones" ("fecha")`,
            `CREATE INDEX IF NOT EXISTS "idx_reasignaciones_motivo" ON "reasignaciones" ("motivo")`,
            `CREATE INDEX IF NOT EXISTS "idx_reasignaciones_vendedor_nuevo_id" ON "reasignaciones" ("vendedor_nuevo_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_reasignaciones_vendedor_anterior_id" ON "reasignaciones" ("vendedor_anterior_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_reasignaciones_lead_id" ON "reasignaciones" ("lead_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_notificaciones_vendedor_id" ON "notificaciones" ("vendedor_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_metas_vendedor_id" ON "metas" ("vendedor_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_pedidos_vendedor_id" ON "pedidos" ("vendedor_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_oportunidades_vendedor_id" ON "oportunidades" ("vendedor_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_reuniones_vendedor_id" ON "reuniones" ("vendedor_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_actividades_vendedor_id" ON "actividades" ("vendedor_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_actividades_cliente_id" ON "actividades" ("cliente_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_tickets_vendedor_id" ON "tickets" ("vendedor_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_clientes_estado" ON "clientes" ("estado")`,
            `CREATE INDEX IF NOT EXISTS "idx_clientes_vendedor_id" ON "clientes" ("vendedor_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_vendedor_zona_zona_id" ON "vendedor_zona" ("zona_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_vendedor_zona_vendedor_id" ON "vendedor_zona" ("vendedor_id")`,
            `DO $$ BEGIN
               IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_cliente_id_fkey') THEN
                 ALTER TABLE "leads" ADD CONSTRAINT "leads_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
               END IF;
             END $$;`,
            `DO $$ BEGIN
               IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_vendedor_asignado_id_fkey') THEN
                 ALTER TABLE "leads" ADD CONSTRAINT "leads_vendedor_asignado_id_fkey" FOREIGN KEY ("vendedor_asignado_id") REFERENCES "vendedores"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
               END IF;
             END $$;`,
            `DO $$ BEGIN
               IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_zona_id_fkey') THEN
                 ALTER TABLE "leads" ADD CONSTRAINT "leads_zona_id_fkey" FOREIGN KEY ("zona_id") REFERENCES "zonas"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
               END IF;
             END $$;`,
            `DO $$ BEGIN
               IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'conversaciones_vendedor_id_fkey') THEN
                 ALTER TABLE "conversaciones" ADD CONSTRAINT "conversaciones_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "vendedores"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
               END IF;
             END $$;`,
            `DO $$ BEGIN
               IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'conversaciones_lead_id_fkey') THEN
                 ALTER TABLE "conversaciones" ADD CONSTRAINT "conversaciones_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
               END IF;
             END $$;`,
            `DO $$ BEGIN
               IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mensajes_conversacion_id_fkey') THEN
                 ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_conversacion_id_fkey" FOREIGN KEY ("conversacion_id") REFERENCES "conversaciones"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
               END IF;
             END $$;`,
            `DO $$ BEGIN
               IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reasignaciones_vendedor_nuevo_id_fkey') THEN
                 ALTER TABLE "reasignaciones" ADD CONSTRAINT "reasignaciones_vendedor_nuevo_id_fkey" FOREIGN KEY ("vendedor_nuevo_id") REFERENCES "vendedores"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
               END IF;
             END $$;`,
            `DO $$ BEGIN
               IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reasignaciones_vendedor_anterior_id_fkey') THEN
                 ALTER TABLE "reasignaciones" ADD CONSTRAINT "reasignaciones_vendedor_anterior_id_fkey" FOREIGN KEY ("vendedor_anterior_id") REFERENCES "vendedores"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
               END IF;
             END $$;`,
            `DO $$ BEGIN
               IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reasignaciones_lead_id_fkey') THEN
                 ALTER TABLE "reasignaciones" ADD CONSTRAINT "reasignaciones_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
               END IF;
             END $$;`,
            `DO $$ BEGIN
               IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vendedor_zona_zona_id_fkey') THEN
                 ALTER TABLE "vendedor_zona" ADD CONSTRAINT "vendedor_zona_zona_id_fkey" FOREIGN KEY ("zona_id") REFERENCES "zonas"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
               END IF;
             END $$;`,
            `DO $$ BEGIN
               IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vendedor_zona_vendedor_id_fkey') THEN
                 ALTER TABLE "vendedor_zona" ADD CONSTRAINT "vendedor_zona_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "vendedores"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
               END IF;
             END $$;`,
        ];
        for (const sql of guards) {
            await queryRunner.query(sql);
        }
    }

}
