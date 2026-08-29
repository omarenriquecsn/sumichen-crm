import { Cliente, Pedido, Oportunidad, Actividad, Mes } from "../types";
import { clientesNuevosMes } from "./clientes";

// ⚠ Legacy: comparaba "este mes" contra TODO el histórico acumulado y contaba registros (no dinero).
// Se mantiene por compatibilidad con los dashboards (DashboardAdmin/DashboardVendedor).
// Para comparaciones reales mes a mes usar incrementoMensual / incrementoEntreValores.
export const calculoIncremento = (
  valorFinal: Cliente[] | Pedido[] | Oportunidad[] | Actividad[]
) => {
  const valorInicial = (Array.isArray(valorFinal) ? valorFinal : []).filter(
    (valor) =>
      new Date(valor.fecha_creacion).getMonth() !== new Date().getMonth()
  );
  let incremento: number;
  if (valorInicial.length === 0) {
    incremento =
      (Array.isArray(valorFinal) ? valorFinal : []).length > 0 ? 100 : 0;
  } else {
    incremento =
      (((Array.isArray(valorFinal) ? valorFinal : []).length -
        valorInicial.length) /
        valorInicial.length) *
      100;
  }
  return incremento;
};

// Diferencia porcentual real entre dos valores del mismo indicador.
// Devuelve null cuando no hay base de comparación (se muestra "—" en vez de un % falso).
export const incrementoEntreValores = (
  valorActual: number,
  valorAnterior: number
): number | null => {
  if (valorAnterior === 0) return valorActual > 0 ? null : 0;
  return ((valorActual - valorAnterior) / valorAnterior) * 100;
};

// Incremento real mes a mes (con cruce de año). Si se pasa getValor, suma ese valor por registro (dinero).
export const incrementoMensual = <T>(
  lista: T[],
  getValor?: (item: T) => number
): number | null => {
  const ahora = new Date();
  const mesActual = ahora.getMonth();
  const anioActual = ahora.getFullYear();
  const mesAnterior = mesActual === 0 ? 11 : mesActual - 1;
  const anioAnterior = mesActual === 0 ? anioActual - 1 : anioActual;

  const sumar = (items: T[]) =>
    getValor ? items.reduce((acc, it) => acc + getValor(it), 0) : items.length;

  const delMes = (mes: number, anio: number) =>
    (Array.isArray(lista) ? lista : []).filter((item) => {
      const fecha = new Date(
        (item as { fecha_creacion?: unknown }).fecha_creacion as string
      );
      return (
        !isNaN(fecha.getTime()) &&
        fecha.getMonth() === mes &&
        fecha.getFullYear() === anio
      );
    });

  const actual = sumar(delMes(mesActual, anioActual));
  const anterior = sumar(delMes(mesAnterior, anioAnterior));

  return incrementoEntreValores(actual, anterior);
};

// Calculo de tasa de conversion (histórica)
export const tasaDeConversion = (oportunidades: Oportunidad[] | undefined) => {
  if (!oportunidades) return 0;
  const totalOportunidades = (Array.isArray(oportunidades) ? oportunidades : [])
    .length;
  const oportunidadesCerradas = (
    Array.isArray(oportunidades) ? oportunidades : []
  ).filter((oportunidad) => oportunidad.etapa === "cerrado");

  const tasaDeConversion =
    (oportunidadesCerradas.length / totalOportunidades) * 100;
  return tasaDeConversion;
};

// Tasa de conversión dentro de un periodo específico (mes/año)
export const tasaConversionMes = (
  oportunidades: Oportunidad[] | undefined,
  mes: number,
  anio: number
): number => {
  const delPeriodo = (Array.isArray(oportunidades) ? oportunidades : []).filter(
    (o) => {
      const fecha = new Date(o.fecha_creacion);
      return fecha.getMonth() === mes && fecha.getFullYear() === anio;
    }
  );
  if (delPeriodo.length === 0) return 0;
  return (
    (delPeriodo.filter((o) => o.etapa === "cerrado").length / delPeriodo.length) *
    100
  );
};

// Variación de la tasa de conversión en puntos porcentuales (mes actual vs anterior)
export const incrementoConversionMensual = (
  oportunidades: Oportunidad[] | undefined
): number => {
  const ahora = new Date();
  const mesActual = ahora.getMonth();
  const anioActual = ahora.getFullYear();
  const mesAnterior = mesActual === 0 ? 11 : mesActual - 1;
  const anioAnterior = mesActual === 0 ? anioActual - 1 : anioActual;
  return (
    tasaConversionMes(oportunidades, mesActual, anioActual) -
    tasaConversionMes(oportunidades, mesAnterior, anioAnterior)
  );
};

// Calculo de ventas por mes (solo año actual, para no contar pedidos de años pasados)
export const ventasPorMes = (
  pedidos: Pedido[] | undefined,
  mes: number
): number => {
  const anioActual = new Date().getFullYear();
  return Array.isArray(pedidos)
    ? pedidos
        ?.filter((pedido) => {
          const fecha = new Date(pedido.fecha_creacion);
          return (
            fecha.getMonth() === mes && fecha.getFullYear() === anioActual
          );
        })
        .reduce((total, pedido) => total + Number(pedido.total), 0) ?? 0
    : 0;
};

// Últimos 5 meses (incluye el actual). Si faltan meses del año anterior se rellenan con 0.
export const atras5meses = (ventasPorMes: Mes[]): Mes[] => {
  const meses = [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ];
  const mesActual = new Date().getMonth();
  const resultado: Mes[] = [];
  for (let i = mesActual - 4; i <= mesActual; i++) {
    if (i >= 0 && i < 12 && ventasPorMes[i]) {
      resultado.push(ventasPorMes[i]);
    } else {
      const indice = i < 0 ? i + 12 : i;
      resultado.push({ mes: meses[indice] ?? "", ventas: 0, clientes: 0 });
    }
  }
  return resultado;
};

export const arrayMeses = (
  pedidos: Pedido[],
  clientes: Cliente[] | undefined
) => {
  const losMeses = [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ];
  const meses = [];
  for (let i = 0; i < 12; i++) {
    meses.push({
      mes: losMeses[i],
      ventas: ventasPorMes(pedidos, i),
      clientes: clientesNuevosMes(clientes, i),
    });
  }

  return meses;
};

// Pedidos procesados de un mes/año concreto
const pedidosProcesadosDe = (
  pedidos: Pedido[],
  mes: number,
  anio: number
): Pedido[] =>
  (Array.isArray(pedidos) ? pedidos : []).filter((p) => {
    if (p.estado !== "procesado") return false;
    const fecha = new Date(p.fecha_creacion);
    return (
      !isNaN(fecha.getTime()) &&
      fecha.getMonth() === mes &&
      fecha.getFullYear() === anio
    );
  });

// Clientes distintos que compraron al menos una vez en el periodo
export const compradoresUnicosMes = (
  pedidos: Pedido[],
  mes?: number,
  anio?: number
): number => {
  const m = mes ?? new Date().getMonth();
  const a = anio ?? new Date().getFullYear();
  return new Set(pedidosProcesadosDe(pedidos, m, a).map((p) => p.cliente_id))
    .size;
};

// Clientes que re-compraron (>=2 pedidos procesados) en el periodo
export const clientesRecurrentesMes = (
  pedidos: Pedido[],
  mes?: number,
  anio?: number
): string[] => {
  const m = mes ?? new Date().getMonth();
  const a = anio ?? new Date().getFullYear();
  const conteo = new Map<string, number>();
  pedidosProcesadosDe(pedidos, m, a).forEach((p) =>
    conteo.set(p.cliente_id, (conteo.get(p.cliente_id) ?? 0) + 1)
  );
  return Array.from(conteo.entries())
    .filter(([, c]) => c >= 2)
    .map(([id]) => id);
};

// Cantidad de clientes recurrentes del mes (>=2 pedidos procesados)
export const recompras = (
  pedidos: Pedido[],
  mes?: number,
  anio?: number
): number => clientesRecurrentesMes(pedidos, mes, anio).length;
