import { MigrationInterface, QueryRunner } from "typeorm";

export class TransporteSchema1787524209000 implements MigrationInterface {
    name = 'TransporteSchema1787524209000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "transporte" ("id" uuid NOT NULL, "nombre" character varying(100), "cedula" character varying(50), "marca" character varying(100), "modelo" character varying(100), "placa" character varying(50), CONSTRAINT "PK_transporte" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "pedidos" ADD COLUMN IF NOT EXISTS "transporte_id" uuid`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_pedidos_transporte_id" ON "pedidos" ("transporte_id") `);
        await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_pedidos_transporte') THEN ALTER TABLE "pedidos" ADD CONSTRAINT "FK_pedidos_transporte" FOREIGN KEY ("transporte_id") REFERENCES "transporte"("id") ON DELETE SET NULL ON UPDATE NO ACTION; END IF; END $$;`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "pedidos" DROP CONSTRAINT IF EXISTS "FK_pedidos_transporte"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_pedidos_transporte_id"`);
        await queryRunner.query(`ALTER TABLE "pedidos" DROP COLUMN IF EXISTS "transporte_id"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "transporte"`);
    }
}
