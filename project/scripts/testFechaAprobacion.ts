/**
 * Verificación de la atribución de ventas por MES DE APROBACIÓN.
 *
 * Cambio: los cálculos por mes usan `fecha_aprobacion ?? fecha_creacion`
 * (helper `fechaVentaPedido`), en vez de `fecha_creacion`.
 *
 * Ejecutar (desde `project/`):
 *   npx esbuild scripts/testFechaAprobacion.ts --bundle --platform=node --format=cjs --outfile=%TEMP%/test-fecha-aprob.cjs --log-level=error
 *   node %TEMP%/test-fecha-aprob.cjs
 *
 * Es un script de verificación (no un framework de tests). Si algo falla,
 * lanza y el proceso sale con código != 0.
 */
import type { Pedido } from "../src/types";
import {
  fechaVentaPedido,
  esPedidoVenta,
  montoNetoPedido,
} from "../src/utils/pedidos";
import { ventasPorMes, incrementoMensual } from "../src/utils/ventas";

let fallos = 0;
const ok = (cond: boolean, nombre: string, extra?: unknown) => {
  if (cond) {
    console.log(`  \u2713 ${nombre}`);
  } else {
    fallos++;
    console.error(`  \u2717 ${nombre}`, extra !== undefined ? extra : "");
  }
};

const ahora = new Date();
const mesActual = ahora.getMonth();
const anioActual = ahora.getFullYear();
const mesAnterior = mesActual === 0 ? 11 : mesActual - 1;

/** Fecha en el mes indicado (offset relativo al mes actual). */
const fecha = (offsetMes: number, dia = 15): Date => {
  const d = new Date(anioActual, mesActual + offsetMes, dia, 12, 0, 0);
  return d;
};

type PedidoLite = Pick<
  Pedido,
  | "id"
  | "estado"
  | "total"
  | "total_devuelto"
  | "fecha_creacion"
  | "fecha_aprobacion"
  | "cliente_id"
>;

const pedido = (over: Partial<PedidoLite>): Pedido => {
  const base: PedidoLite = {
    id: Math.random().toString(36).slice(2),
    estado: "procesado",
    total: 1000,
    total_devuelto: 0,
    fecha_creacion: fecha(0),
    fecha_aprobacion: fecha(0),
    cliente_id: "cli-1",
  };
  return { ...base, ...over } as unknown as Pedido;
};

console.log("\n== 1. Helper fechaVentaPedido ==");
{
  ok(
    fechaVentaPedido(
      pedido({ fecha_creacion: fecha(-1), fecha_aprobacion: fecha(0) }),
    ).getMonth() === mesActual,
    "usa fecha_aprobacion cuando existe",
  );
  ok(
    fechaVentaPedido(
      pedido({ fecha_creacion: fecha(-1), fecha_aprobacion: null }),
    ).getMonth() === mesAnterior,
    "cae a fecha_creacion si fecha_aprobacion es null (histórico)",
  );
  ok(
    fechaVentaPedido(
      pedido({ fecha_creacion: fecha(-1), fecha_aprobacion: undefined }),
    ).getMonth() === mesAnterior,
    "cae a fecha_creacion si fecha_aprobacion es undefined",
  );
}

console.log("\n== 2. esPedidoVenta / montoNetoPedido ==");
{
  ok(esPedidoVenta({ estado: "procesado" } as never), "procesado cuenta como venta");
  ok(
    esPedidoVenta({ estado: "devuelto_parcial" } as never),
    "devuelto_parcial cuenta como venta",
  );
  ok(!esPedidoVenta({ estado: "pendiente" } as never), "pendiente NO cuenta");
  ok(!esPedidoVenta({ estado: "devuelto" } as never), "devuelto (total) NO cuenta");
  ok(
    montoNetoPedido({ total: 1000, total_devuelto: 300 }) === 700,
    "montoNetoPedido resta la devolución (700)",
  );
  ok(
    montoNetoPedido({ total: 1000, total_devuelto: null as never }) === 1000,
    "montoNetoPedido sin devolución = total",
  );
}

console.log("\n== 3. Caso principal: creado el mes pasado, aprobado este mes ==");
{
  const p = pedido({
    total: 1000,
    fecha_creacion: fecha(-1, 28),
    fecha_aprobacion: fecha(0, 1),
  });
  ok(
    ventasPorMes([p], mesActual) === 1000,
    "cuenta en el MES DE APROBACIÓN (mes actual)",
  );
  ok(
    ventasPorMes([p], mesAnterior) === 0,
    "NO cuenta en el mes de creación (mes pasado)",
  );
}

console.log("\n== 4. Creado y aprobado el mismo mes ==");
{
  const p = pedido({ fecha_creacion: fecha(0, 5), fecha_aprobacion: fecha(0, 6) });
  ok(ventasPorMes([p], mesActual) === 1000, "cuenta en el mes actual");
}

console.log("\n== 5. Histórico sin fecha_aprobacion (fallback a creación) ==");
{
  const p = pedido({ fecha_creacion: fecha(0, 10), fecha_aprobacion: null });
  ok(
    ventasPorMes([p], mesActual) === 1000,
    "cuenta en el mes de creación (comportamiento previo preservado)",
  );
  const pMesPasado = pedido({
    fecha_creacion: fecha(-1, 10),
    fecha_aprobacion: null,
  });
  ok(
    ventasPorMes([pMesPasado], mesAnterior) === 1000,
    "un histórico del mes pasado sigue contando en el mes pasado",
  );
}

console.log("\n== 6. Pedido pendiente (no aprobado) ==");
{
  const p = pedido({
    estado: "pendiente",
    fecha_creacion: fecha(-1),
    fecha_aprobacion: null,
  });
  ok(
    ventasPorMes([p], mesActual) === 0 && ventasPorMes([p], mesAnterior) === 0,
    "un pendiente no cuenta en ningún mes",
  );
}

console.log("\n== 7. Devolución parcial (cuenta en el mes de aprobación) ==");
{
  const p = pedido({
    estado: "devuelto_parcial",
    total: 1000,
    total_devuelto: 250,
    fecha_creacion: fecha(-1, 28),
    fecha_aprobacion: fecha(0, 1),
  });
  ok(
    ventasPorMes([p], mesActual) === 750,
    "suma el NETO (1000 - 250 = 750) en el mes de aprobación",
  );
  ok(ventasPorMes([p], mesAnterior) === 0, "no cuenta en el mes de creación");
}

console.log("\n== 8. Devolución total ==");
{
  const p = pedido({
    estado: "devuelto",
    total: 1000,
    total_devuelto: 1000,
    fecha_creacion: fecha(-1, 28),
    fecha_aprobacion: fecha(0, 1),
  });
  ok(
    ventasPorMes([p], mesActual) === 0,
    "una devolución total no suma (excluido por esPedidoVenta)",
  );
}

console.log("\n== 9. Agregado de varios pedidos por mes ==");
{
  const mismoMes = pedido({ total: 500, fecha_aprobacion: fecha(0, 3) });
  const mesPasadoAprobado = pedido({
    total: 800,
    fecha_creacion: fecha(-2),
    fecha_aprobacion: fecha(-1, 20),
  });
  const pendiente = pedido({
    estado: "pendiente",
    total: 9999,
    fecha_aprobacion: null,
    fecha_creacion: fecha(-1),
  });
  ok(
    ventasPorMes([mismoMes, mesPasadoAprobado, pendiente], mesActual) === 500,
    "mes actual solo suma los aprobados de este mes",
  );
  ok(
    ventasPorMes([mismoMes, mesPasadoAprobado, pendiente], mesAnterior) === 800,
    "mes pasado suma el aprobado el mes pasado",
  );
}

console.log("\n== 10. incrementoMensual con accessor de fecha de aprobación ==");
{
  const esteMes = pedido({ total: 1200, fecha_aprobacion: fecha(0, 4) });
  const mesPasado = pedido({ total: 1000, fecha_aprobacion: fecha(-1, 4) });
  const inc = incrementoMensual(
    [esteMes, mesPasado],
    (p) => Number(p.total),
    (p) => fechaVentaPedido(p),
  );
  ok(inc !== null && Math.round(inc) === 20, "incremento oct vs sep = 20%", inc);
}

console.log(
  `\n${fallos === 0 ? "\u2705 TODOS LOS CASOS PASARON" : `\u274c ${fallos} CASO(S) FALLARON`}\n`,
);
process.exit(fallos === 0 ? 0 : 1);
