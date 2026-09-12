import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migración "Upgrade legacy schema":
 *
 * Elimina los triggers y funciones de base de datos que existían en la versión
 * antigua de la app sobre la tabla `reuniones`. El backend actual ya crea,
 * actualiza y limpia la `Actividad` vinculada a cada reunión desde el código
 * (`reunionesServices.ts`), por lo que mantener estos triggers provoca
 * actividades duplicadas / comportamiento inesperado.
 *
 * Idempotente: usa `IF EXISTS`, así que es no-op en una DB nueva (donde esos
 * objetos no existen) y limpia la DB legacy restaurada.
 */
export class UpgradeLegacySchema1787524215000 implements MigrationInterface {
  name = 'UpgradeLegacySchema1787524215000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const sqls: string[] = [
      // Triggers legacy sobre reuniones
      `DROP TRIGGER IF EXISTS tr_actualizar_actividad_tras_reunion ON reuniones;`,
      `DROP TRIGGER IF EXISTS tr_reuniones_gestion_actividades ON reuniones;`,
      `DROP TRIGGER IF EXISTS tr_reuniones_cancelacion_actividad ON reuniones;`,
      // Funciones legacy (CASCADE elimina dependencias restantes)
      `DROP FUNCTION IF EXISTS sincronizar_actividad_reunion() CASCADE;`,
      `DROP FUNCTION IF EXISTS fn_limpiar_actividad_por_cancelacion() CASCADE;`,
    ];

    for (const sql of sqls) {
      await queryRunner.query(sql);
    }
  }

  public async down(): Promise<void> {
    // No se recrean: los triggers/funciones legacy ya no se usan.
  }
}
