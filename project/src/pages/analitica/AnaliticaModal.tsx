import React from "react";
import {
  TrendingUp,
  DollarSign,
  Users,
  Target,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
} from "lucide-react";
import { useSupabase } from "../../hooks/useSupabase";
import { useVentas } from "../../hooks/useVentas";
import {
  atras5meses,
  arrayMeses,
  incrementoEntreValores,
  incrementoMensual,
  tasaDeConversion,
  incrementoConversionMensual,
  recompras,
  compradoresUnicosMes,
} from "../../utils/ventas";
import { typeChange } from "../../constants/typeChange";
import {
  objetivoClientesConvertidos,
  clientesProspectosMes,
  clientesProspectosMesAnio,
  clientesActualizadosMes,
} from "../../utils/clientes";
import { Actividad, Mes, Meta } from "../../types";
import { actividadesPoCategoria } from "../../utils/actividades";
import { getColorClasses } from "../../utils/analitica";
import { clientePorEtapaAnalitica } from "../../utils/oportunidades";
import { useGetMetas } from "../../hooks/useMetas";
import { User } from "@supabase/supabase-js";
import {
  formatCurrency,
  formatCurrencyCompacto,
  formatNumero,
} from "../../utils/formato";
import { ValorConDetalle } from "../../components/ui/ValorConDetalle";

const coloresEtapa = [
  "bg-gray-400",
  "bg-blue-400",
  "bg-yellow-400",
  "bg-orange-400",
  "bg-green-400",
];

const coloresActividad = [
  "bg-blue-400",
  "bg-green-400",
  "bg-purple-400",
  "bg-orange-400",
];

interface AnaliticaModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendedor: User | null;
}
const AnaliticaModal: React.FC<AnaliticaModalProps> = ({
  isOpen,
  onClose,
  vendedor,
}) => {
  const supabase = useSupabase();
  const currentUser = vendedor;
  const { data: pedidosDB } = supabase.usePedidos();

  const pedidos = Array.isArray(pedidosDB)
    ? pedidosDB.filter((p) => p.vendedor_id === currentUser?.id)
    : [];

  //Oportunidades
  const { data: oportunidadesDB } = supabase.useOportunidades();
  const oportunidades = Array.isArray(oportunidadesDB)
    ? oportunidadesDB.filter((o) => o.vendedor_id === currentUser?.id)
    : [];

  //Actividades
  const { data: actividadesDB } = supabase.useActividades();

  const actividades = Array.isArray(actividadesDB)
    ? actividadesDB.filter((a) => a.vendedor_id === currentUser?.id)
    : [];

  // Clientes
  const { data: clientesDB } = supabase.useClientes();
  const clientes = Array.isArray(clientesDB)
    ? clientesDB.filter((c) => c.vendedor_id === currentUser?.id)
    : [];

  // Ventas
  const { PedidosProcesados, cifraVentasMes } = useVentas(pedidos);

  const cargando =
    !pedidosDB || !oportunidadesDB || !actividadesDB || !clientesDB;

  // Metas
  const { data: metas } = useGetMetas(currentUser?.id ? currentUser.id : "");

  //meta del mes
  const arrayMeses2 = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  const metasVendedor = Array.isArray(metas)
    ? metas?.filter((meta: Meta) => meta.vendedor_id === currentUser?.id)
    : [];

  const metasMes = metasVendedor?.find(
    (meta: Meta) => meta.mes === arrayMeses2[new Date().getMonth()],
  );

  const ahora = new Date();
  const mesActual = ahora.getMonth();
  const anioActual = ahora.getFullYear();
  const mesAnterior = mesActual === 0 ? 11 : mesActual - 1;
  const anioAnterior = mesActual === 0 ? anioActual - 1 : anioActual;

  const clientesProspecto = clientesProspectosMes(clientes, mesActual);
  const prospectosMesAnterior = clientesProspectosMesAnio(
    clientes,
    mesAnterior,
    anioAnterior,
  );

  const cifraMesActual = cifraVentasMes(mesActual);
  const incrementoVentas = incrementoMensual(PedidosProcesados, (p) =>
    Number(p.total),
  );
  const incrementoClientes = incrementoEntreValores(
    clientesProspecto,
    prospectosMesAnterior,
  );

  const recomprasMesActual = recompras(PedidosProcesados);
  const recomprasMesAnterior = recompras(
    PedidosProcesados,
    mesAnterior,
    anioAnterior,
  );
  const incrementoRecompras = incrementoEntreValores(
    recomprasMesActual,
    recomprasMesAnterior,
  );
  const incrementoConversion = incrementoConversionMensual(oportunidades);

  // Array de meses
  const ventasPorMeses: Mes[] = arrayMeses(PedidosProcesados, clientes);

  // Funcion para obtener los ultimos 5 meses
  const ventasPorMes = atras5meses(ventasPorMeses);
  const maxVentas = Math.max(...ventasPorMes.map((m) => m.ventas), 1);
  const hayVentas = ventasPorMes.some((m) => m.ventas > 0 || m.clientes > 0);

  const actividadesPorMes: Actividad[] = Array.isArray(actividades)
    ? actividades.filter((actividad: Actividad) => {
        const fecha = new Date(actividad.fecha);
        return fecha.getMonth() === mesActual && fecha.getFullYear() === anioActual;
      })
    : [];

  const actividadesCompletadasMes = Array.isArray(actividades)
    ? actividades.filter(
        (a) =>
          a.completado &&
          new Date(a.fecha).getMonth() === mesActual &&
          new Date(a.fecha).getFullYear() === anioActual,
      ).length
    : 0;

  const clientesPorEtapa = [
    clientePorEtapaAnalitica(oportunidades, "inicial"),
    clientePorEtapaAnalitica(oportunidades, "calificado"),
    clientePorEtapaAnalitica(oportunidades, "propuesta"),
    clientePorEtapaAnalitica(oportunidades, "negociacion"),
    clientePorEtapaAnalitica(oportunidades, "cerrado"),
  ];

  const actividadesPorTipo = [
    actividadesPoCategoria(actividadesPorMes, "llamada", metas),
    actividadesPoCategoria(actividadesPorMes, "email", metas),
    actividadesPoCategoria(actividadesPorMes, "reunion", metas),
    actividadesPoCategoria(actividadesPorMes, "tarea", metas),
  ];
  const maxCantidadActividades = Math.max(
    ...actividadesPorTipo.map((a) => a.cantidad),
    1,
  );

  const compradoresMes = compradoresUnicosMes(PedidosProcesados);

  const hayMetas = Boolean(
    metasMes &&
      ((metasMes.objetivo_ventas || 0) > 0 ||
        (metasMes.objetivo_clientes || 0) > 0 ||
        (metasMes.llamadas || 0) > 0 ||
        (metasMes.emails || 0) > 0 ||
        (metasMes.reuniones || 0) > 0 ||
        (metasMes.tareas || 0) > 0),
  );

  const totalMetas = () => {
    if (!metasMes) return 0;
    return (
      (metasMes.llamadas || 0) +
      (metasMes.emails || 0) +
      (metasMes.reuniones || 0) +
      (metasMes.tareas || 0)
    );
  };

  const porcentaje = (parte: number, total: number) => {
    if (!total || total < 0) return 0;
    if (parte > total) return 100;
    return (parte / total) * 100;
  };

  const metricas = [
    {
      titulo: "Ventas del Mes",
      valor: Number(cifraMesActual) || 0,
      esDinero: true,
      esPorcentaje: false,
      cambio: incrementoVentas,
      cambioEnPuntos: false,
      tipo: incrementoVentas === null ? "neutral" : typeChange(incrementoVentas),
      icon: DollarSign,
      color: "green",
    },
    {
      titulo: "Nuevos Prospectos",
      valor: Number(clientesProspecto) || 0,
      esDinero: false,
      esPorcentaje: false,
      cambio: incrementoClientes,
      cambioEnPuntos: false,
      tipo:
        incrementoClientes === null ? "neutral" : typeChange(incrementoClientes),
      icon: Users,
      color: "blue",
    },
    {
      titulo: "Tasa de Cierres",
      valor: Number(tasaDeConversion(oportunidades) || 0),
      esDinero: false,
      esPorcentaje: true,
      cambio: incrementoConversion,
      cambioEnPuntos: true,
      tipo:
        incrementoConversion === 0 ? "neutral" : typeChange(incrementoConversion),
      icon: Target,
      color: "purple",
    },
    {
      titulo: "Clientes Recurrentes",
      valor: Number(recomprasMesActual) || 0,
      esDinero: false,
      esPorcentaje: false,
      cambio: incrementoRecompras,
      cambioEnPuntos: false,
      tipo:
        incrementoRecompras === null ? "neutral" : typeChange(incrementoRecompras),
      icon: Activity,
      color: "orange",
    },
  ];

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 "
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-xl shadow-2xl p-6 max-w-5xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón de cerrar */}
        <button
          className="absolute top-1 right-4 text-red-400 hover:text-red-600 text-2xl font-bold  w-8 h-8 flex justify-center items-center "
          onClick={onClose}
          aria-label="Cerrar"
        >
          ×
        </button>
        <div className="space-y-6 mt-3">
          {cargando ? (
            <div className="animate-pulse space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-gray-200 rounded-xl" />
                ))}
              </div>
              <div className="h-64 bg-gray-200 rounded-xl" />
              <div className="h-64 bg-gray-200 rounded-xl" />
            </div>
          ) : (
            <>
              {/* Métricas principales */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {metricas.map((metrica) => (
                  <div
                    key={metrica.titulo}
                    className="bg-white rounded-xl shadow-sm p-6 border border-gray-100"
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-600">
                          {metrica.titulo}
                        </p>
                        {metrica.esDinero ? (
                          <ValorConDetalle
                            visible={formatCurrencyCompacto(metrica.valor)}
                            exacto={formatCurrency(metrica.valor)}
                            className="text-2xl font-bold text-gray-900 mt-2"
                          />
                        ) : metrica.esPorcentaje ? (
                          <p className="text-2xl font-bold text-gray-900 mt-2 break-words">
                            {`${formatNumero(metrica.valor)}%`}
                          </p>
                        ) : (
                          <p className="text-2xl font-bold text-gray-900 mt-2 break-words">
                            {formatNumero(metrica.valor)}
                          </p>
                        )}
                        <p
                          className={`text-sm mt-2 ${
                            metrica.tipo === "positive" ||
                            metrica.tipo === "neutral"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {typeof metrica.cambio === "number"
                            ? metrica.cambioEnPuntos
                              ? `${metrica.cambio.toLocaleString(undefined, {
                                  maximumFractionDigits: 2,
                                })} pts vs mes anterior`
                              : `${metrica.cambio.toLocaleString(undefined, {
                                  maximumFractionDigits: 2,
                                })} % vs mes anterior`
                            : metrica.cambio === null
                              ? "— vs mes anterior"
                              : ""}
                        </p>
                      </div>
                      <div
                        className={`p-3 rounded-full ${getColorClasses(
                          metrica.color,
                        )}`}
                      >
                        <metrica.icon className="h-6 w-6" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Gráfico de ventas mensuales */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Ventas Mensuales
                      </h3>
                      {metasMes?.objetivo_ventas ? (
                        <p className="text-xs text-gray-400">
                          Meta del mes:{" "}
                          {formatCurrencyCompacto(metasMes.objetivo_ventas)}
                        </p>
                      ) : null}
                    </div>
                    <BarChart3 className="h-5 w-5 text-gray-400" />
                  </div>

                  {!hayVentas ? (
                    <p className="text-sm text-gray-400 text-center py-8">
                      Sin ventas en los últimos 5 meses
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {ventasPorMes.map((mes) => (
                        <div
                          key={mes.mes}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-sm font-medium text-gray-600 w-8">
                              {mes.mes}
                            </span>
                            <div className="flex-1 bg-gray-200 rounded-full h-2 w-32">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{
                                  width: `${(mes.ventas / maxVentas) * 100}%`,
                                }}
                              ></div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">
                              {formatCurrencyCompacto(mes.ventas)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {mes.clientes} clientes
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pipeline por etapas */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Pipeline por Etapas
                    </h3>
                    <PieChart className="h-5 w-5 text-gray-400" />
                  </div>

                  {!Array.isArray(oportunidades) || oportunidades.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">
                      Sin oportunidades en el pipeline
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {clientesPorEtapa.map((etapa, index) => (
                        <div
                          key={etapa.etapa}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-3">
                            <div
                              className={`w-3 h-3 rounded-full ${
                                coloresEtapa[index] ?? "bg-gray-400"
                              }`}
                            ></div>
                            <div>
                              <span className="text-sm font-medium text-gray-900">
                                {etapa.etapa}
                              </span>
                              <p className="text-xs text-gray-400">
                                prob. prom. {etapa.probabilidadPromedio.toFixed(0)}%
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 w-20">
                              <div
                                className={`h-2 rounded-full ${
                                  coloresEtapa[index] ?? "bg-gray-400"
                                }`}
                                style={{ width: `${etapa.porcentaje}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-semibold text-gray-900 w-8">
                              {etapa.cantidad}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Actividades por tipo */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Actividades por Tipo
                    </h3>
                    <Activity className="h-5 w-5 text-gray-400" />
                  </div>

                  {actividadesCompletadasMes === 0 &&
                  actividadesPorTipo.every((a) => a.cantidad === 0) ? (
                    <p className="text-sm text-gray-400 text-center py-8">
                      Sin actividades completadas este mes
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {actividadesPorTipo.map((actividad, index) => {
                        const ancho =
                          actividad.porcentaje !== null
                            ? actividad.porcentaje
                            : (actividad.cantidad / maxCantidadActividades) *
                              100;
                        return (
                          <div
                            key={actividad.tipo}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center space-x-3">
                              <div
                                className={`w-3 h-3 rounded-full ${
                                  coloresActividad[index] ?? "bg-blue-400"
                                }`}
                              ></div>
                              <div>
                                <span className="text-sm font-medium text-gray-900">
                                  {actividad.tipo}
                                </span>
                                {actividad.meta > 0 ? (
                                  <p className="text-xs text-gray-400">
                                    meta: {actividad.meta}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <div className="flex-1 bg-gray-200 rounded-full h-2 w-20">
                                <div
                                  className={`h-2 rounded-full ${
                                    coloresActividad[index] ?? "bg-blue-400"
                                  }`}
                                  style={{ width: `${ancho}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-semibold text-gray-900 w-8">
                                {actividad.cantidad}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Metas mensuales */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Progreso de Metas
                    </h3>
                    <Target className="h-5 w-5 text-gray-400" />
                  </div>

                  {!hayMetas ? (
                    <p className="text-sm text-gray-400 text-center py-8">
                      No hay metas configuradas para este mes
                    </p>
                  ) : (
                    <div className="space-y-6">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-600">
                            Meta de Ventas
                          </span>
                          <span className="text-sm font-semibold text-gray-900">
                            {`${porcentaje(
                              cifraMesActual,
                              metasMes?.objetivo_ventas || 0,
                            ).toFixed(2)}%`}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-green-500 h-3 rounded-full"
                            style={{
                              width: `${porcentaje(
                                cifraMesActual,
                                metasMes?.objetivo_ventas || 0,
                              ).toFixed(2)}%`,
                            }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>{formatCurrency(cifraMesActual)}</span>
                          <span>
                            {formatCurrency(metasMes?.objetivo_ventas || 0)}
                          </span>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-600">
                            Meta de Conversion
                          </span>
                          <span className="text-sm font-semibold text-gray-900">
                            {`${porcentaje(
                              clientesActualizadosMes(clientes, mesActual),
                              objetivoClientesConvertidos(clientes ?? []) || 0,
                            ).toFixed(2)}%`}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-blue-500 h-3 rounded-full"
                            style={{
                              width: `${porcentaje(
                                clientesActualizadosMes(clientes, mesActual),
                                objetivoClientesConvertidos(clientes ?? []) || 0,
                              ).toFixed(2)}%`,
                            }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>
                            {clientesActualizadosMes(clientes, mesActual) || 0}
                          </span>
                          <span>
                            {objetivoClientesConvertidos(clientes ?? []) || 0}
                          </span>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-600">
                            Meta de Prospectos
                          </span>
                          <span className="text-sm font-semibold text-gray-900">
                            {`${porcentaje(
                              clientesProspecto,
                              metasMes?.objetivo_clientes || 0,
                            ).toFixed(2)}%`}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-blue-500 h-3 rounded-full"
                            style={{
                              width: `${porcentaje(
                                clientesProspecto,
                                metasMes?.objetivo_clientes || 0,
                              ).toFixed(2)}%`,
                            }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>{clientesProspecto || 0}</span>
                          <span>{metasMes?.objetivo_clientes || 0}</span>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-600">
                            Meta de Actividades
                          </span>
                          <span className="text-sm font-semibold text-gray-900">
                            {`${porcentaje(
                              actividadesCompletadasMes,
                              totalMetas(),
                            ).toFixed(2)}%`}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-purple-500 h-3 rounded-full"
                            style={{
                              width: `${porcentaje(
                                actividadesCompletadasMes,
                                totalMetas(),
                              ).toFixed(2)}%`,
                            }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>{actividadesCompletadasMes || 0}</span>
                          <span>{totalMetas()}</span>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-600">
                            Clientes Recurrentes
                          </span>
                          <span className="text-sm font-semibold text-gray-900">
                            {`${porcentaje(
                              recomprasMesActual,
                              compradoresMes,
                            ).toFixed(2)}%`}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-purple-500 h-3 rounded-full"
                            style={{
                              width: `${porcentaje(
                                recomprasMesActual,
                                compradoresMes,
                              ).toFixed(2)}%`,
                            }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>{recomprasMesActual} recompraron</span>
                          <span>{compradoresMes} compradores</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Resumen de rendimiento */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  Resumen de Rendimiento
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-600">
                      {incrementoVentas === null
                        ? "—"
                        : `${incrementoVentas > 0 ? "+" : ""}${incrementoVentas.toLocaleString(
                            undefined,
                            { maximumFractionDigits: 2 },
                          )}%`}
                    </p>
                    <p className="text-sm text-gray-600">
                      Crecimiento en ventas
                    </p>
                  </div>

                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-blue-600">
                      {clientesActualizadosMes(clientes, mesActual) || 0}
                    </p>
                    <p className="text-sm text-gray-600">
                      Nuevos clientes este mes
                    </p>
                  </div>

                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <Calendar className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-purple-600">
                      {actividadesCompletadasMes || 0}
                    </p>
                    <p className="text-sm text-gray-600">
                      Actividades completadas
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnaliticaModal;
