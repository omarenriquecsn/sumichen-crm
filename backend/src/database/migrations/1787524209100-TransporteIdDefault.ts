import { MigrationInterface, QueryRunner } from "typeorm";

// La migración 1787524209000 creó la tabla `transporte` sin DEFAULT en `id`.
// Todas las demás tablas usan `gen_random_uuid()` como default del PK y el uuid
// NO se genera en la app (TypeORM no genera el uuid, depende del default de la DB),
// por eso insertar un transporte fallaba con "null value in column id".
export class TransporteIdDefault1787524209100 implements MigrationInterface {
    name = 'TransporteIdDefault1787524209100'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transporte" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transporte" ALTER COLUMN "id" DROP DEFAULT`);
    }
}
