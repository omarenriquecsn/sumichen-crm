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
  calculoIncremento,
  tasaDeConversion,
  atras5meses,
  arrayMeses,
  recompras,
} from "../../utils/ventas";
import { typeChange } from "../../constants/typeChange";
import {
  objetivoClientesConvertidos,
  clientesProspectosMes,
  clientesNuevosArray,
  clientesActualizadosMes,
} from "../../utils/clientes";
import { Actividad, Mes, Meta, Pedido } from "../../types";
import { actividadesPoCategoria } from "../../utils/actividades";
import { getColorClasses } from "../../utils/analitica";
import { clientePorEtapaAnalitica } from "../../utils/oportunidades";
import { useGetMetas } from "../../hooks/useMetas";
import { User } from "@supabase/supabase-js";

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
  const { PedidosProcesados: PedidosProcesadosDB, cifraVentasMes } =
    useVentas(pedidos);

  const PedidosProcesados = Array.isArray(PedidosProcesadosDB)
    ? PedidosProcesadosDB.filter((p) => p.vendedor_id === currentUser?.id)
    : [];

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

  const metasMes = Array.isArray(metasVendedor)
    ? metasVendedor?.find(
        (meta: Meta) => meta.mes === arrayMeses2[new Date().getMonth()],
      )
    : [];

  const clientesProspecto = clientesProspectosMes(
    clientes,
    new Date().getMonth(),
  );

  const incrementoVentas = calculoIncremento(PedidosProcesados);
  const incrementoClientes = calculoIncremento(clientesNuevosArray(clientes));
  const incrementoPipeline = oportunidades
    ? calculoIncremento(oportunidades)
    : 0;
  const incrementoActividad = actividades ? calculoIncremento(actividades) : 0;

  // Array de meses
  const ventasPorMeses: Mes[] = arrayMeses(PedidosProcesados, clientes);

  // Funcion para obtener los ultimos 5 meses
  const ventasPorMes = atras5meses(ventasPorMeses);

  const actividadesPorMes: Actividad[] = Array.isArray(actividades)
    ? actividades.filter((actividad: Actividad) => {
        return (
          new Date(actividad.fecha).getMonth() === new Date().getMonth() &&
          new Date(actividad.fecha).getFullYear() === new Date().getFullYear()
        );
      })
    : [];

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

  const totalMetas = () => {
    let total = 0;
    if (!metasMes) return 0;
    if (metasMes.reuniones) total += metasMes.reuniones;
    if (metasMes.ventas) total += metasMes.ventas;
    if (metasMes.clientes) total += metasMes.clientes;
    return total;
  };

  const porcentaje = (parte: number, total: number) => {
    if (total === 0 || total < 0 || total === undefined) return 0;
    if (parte > total) return 100;
    return (parte / total) * 100;
  };

  const metricas = [
    {
      titulo: "Ventas del Mes",
      valor: Number(cifraVentasMes(new Date().getMonth())) || 0,
      cambio: Number(incrementoVentas),
      tipo: typeChange(incrementoVentas),
      icon: DollarSign,
      color: "green",
    },
    {
      titulo: "Nuevos Prospectos",
      valor: Number(clientesProspecto) || 0,
      cambio: "Number(incrementoClientes)",
      tipo: typeChange(incrementoClientes),
      icon: Users,
      color: "blue",
    },
    {
      titulo: "Tasa de Cierres",
      valor: Number(tasaDeConversion(oportunidades) || 0),
      cambio: "",
      tipo: typeChange(incrementoPipeline),
      icon: Target,
      color: "purple",
    },
    {
      titulo: "Clientes Recurrentes",
      valor: Number(recompras(pedidos as Pedido[])) || 0,
      cambio: "Number(incrementoActividad),",
      tipo: typeChange(incrementoActividad),
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
          {/* Métricas principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {metricas.map((metrica) => (
              <div
                key={metrica.titulo}
                className="bg-white rounded-xl shadow-sm p-6 border border-gray-100"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {metrica.titulo}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      {typeof metrica.valor === "number"
                        ? metrica.valor.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })
                        : metrica.valor}
                    </p>
                    <p
                      className={`text-sm mt-2 ${
                        metrica.tipo === "positive" ||
                        metrica.tipo === "neutral"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {typeof metrica.cambio === "number"
                        ? `${metrica.cambio.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })} % vs mes anterior`
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
                <h3 className="text-lg font-semibold text-gray-900">
                  Ventas Mensuales
                </h3>
                <BarChart3 className="h-5 w-5 text-gray-400" />
              </div>

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
                          style={{ width: `${(mes.ventas / 50000) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        $
                        {mes.ventas.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}
                      </p>
                      <p className="text-xs text-gray-500">
                        {mes.clientes} clientes
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pipeline por etapas */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Pipeline por Etapas
                </h3>
                <PieChart className="h-5 w-5 text-gray-400" />
              </div>

              <div className="space-y-4">
                {clientesPorEtapa.map((etapa, index) => (
                  <div
                    key={etapa.etapa}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          index === 0
                            ? "bg-gray-400"
                            : index === 1
                              ? "bg-blue-400"
                              : index === 2
                                ? "bg-yellow-400"
                                : index === 3
                                  ? "bg-orange-400"
                                  : "bg-green-400"
                        }`}
                      ></div>
                      <span className="text-sm font-medium text-gray-900">
                        {etapa.etapa}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 w-20">
                        <div
                          className={`h-2 rounded-full ${
                            index === 0
                              ? "bg-gray-400"
                              : index === 1
                                ? "bg-blue-400"
                                : index === 2
                                  ? "bg-yellow-400"
                                  : index === 3
                                    ? "bg-orange-400"
                                    : "bg-green-400"
                          }`}
                          style={{
                            width: `${
                              etapa.porcentaje /
                              (Array.isArray(oportunidades) &&
                              oportunidades?.length > 0
                                ? oportunidades.length
                                : 1)
                            }%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 w-8">
                        {typeof etapa.cantidad === "number"
                          ? etapa.cantidad.toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })
                          : etapa.cantidad}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
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

              <div className="space-y-4">
                {actividadesPorTipo.map((actividad, index) => (
                  <div
                    key={actividad.tipo}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          index === 0
                            ? "bg-blue-400"
                            : index === 1
                              ? "bg-green-400"
                              : index === 2
                                ? "bg-purple-400"
                                : "bg-orange-400"
                        }`}
                      ></div>
                      <span className="text-sm font-medium text-gray-900">
                        {actividad.tipo}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 w-20">
                        <div
                          className={`h-2 rounded-full ${
                            index === 0
                              ? "bg-blue-400"
                              : index === 1
                                ? "bg-green-400"
                                : index === 2
                                  ? "bg-purple-400"
                                  : "bg-orange-400"
                          }`}
                          style={{ width: `${actividad.porcentaje * 2}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 w-8">
                        {typeof actividad.cantidad === "number"
                          ? actividad.cantidad.toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })
                          : actividad.cantidad}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Metas mensuales */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Progreso de Metas
                </h3>
                <Target className="h-5 w-5 text-gray-400" />
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">
                      Meta de Ventas
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {`${porcentaje(
                        cifraVentasMes(new Date().getMonth()),
                        metasMes?.objetivo_ventas || 0,
                      ).toFixed(2)}%`}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-green-500 h-3 rounded-full"
                      style={{
                        width: `${porcentaje(
                          cifraVentasMes(new Date().getMonth()),
                          metasMes?.objetivo_ventas || 0,
                        ).toFixed(2)}%`,
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>${cifraVentasMes(new Date().getMonth())}</span>
                    <span>${metasMes?.objetivo_ventas || 0}</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">
                      Meta de Conversion
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {`${porcentaje(
                        clientesActualizadosMes(
                          clientes,
                          new Date().getMonth(),
                        ),
                        objetivoClientesConvertidos(clientes ?? []) || 0,
                      ).toFixed(2)}%`}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-500 h-3 rounded-full"
                      style={{
                        width: `${porcentaje(
                          clientesActualizadosMes(
                            clientes,
                            new Date().getMonth(),
                          ),
                          objetivoClientesConvertidos(clientes ?? []) || 0,
                        ).toFixed(2)}%`,
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>
                      {clientesActualizadosMes(
                        clientes,
                        new Date().getMonth(),
                      ) || 0}
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
                        Array.isArray(actividades)
                          ? actividades.filter((a) => a.completado).length
                          : 0,
                        totalMetas(),
                      ).toFixed(2)}%`}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-purple-500 h-3 rounded-full"
                      style={{
                        width: `${porcentaje(
                          Array.isArray(actividades)
                            ? actividades.filter((a) => a.completado).length
                            : 0,
                          totalMetas(),
                        )}%`,
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>
                      {(Array.isArray(actividades) ? actividades : []).filter(
                        (a) => a.completado,
                      ).length || 0}
                    </span>
                    <span>{totalMetas()}</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">
                      Meta de Recompras
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {`${porcentaje(
                        Number(recompras(pedidos as Pedido[])) || 0,
                        Array.isArray(clientes) ? clientes.length * 0.2 : 10,
                      ).toFixed(2)}%`}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-purple-500 h-3 rounded-full"
                      style={{
                        width: `${porcentaje(
                          Number(recompras(pedidos as Pedido[])) || 0,
                          Array.isArray(clientes) ? clientes.length * 0.2 : 10,
                        )}%`,
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{Number(recompras(pedidos as Pedido[])) || 0}</span>
                    <span>
                      {Array.isArray(clientes)
                        ? Math.round(clientes.length * 0.2)
                        : 10}
                    </span>
                  </div>
                </div>
              </div>
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
                <p className="text-2xl font-bold text-green-600">{`+${
                  incrementoVentas > 0
                    ? incrementoVentas.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })
                    : 0
                }%`}</p>
                <p className="text-sm text-gray-600">Crecimiento en ventas</p>
              </div>

              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-600">
                  {clientesActualizadosMes(clientes, new Date().getMonth()) ||
                    0}
                </p>
                <p className="text-sm text-gray-600">
                  Nuevos clientes este mes
                </p>
              </div>

              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <Calendar className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-purple-600">
                  {(Array.isArray(actividades) ? actividades : []).filter(
                    (a) =>
                      a.completado &&
                      new Date(a.fecha).getMonth() === new Date().getMonth() &&
                      new Date(a.fecha).getFullYear() ===
                        new Date().getFullYear(),
                  ).length || 0}
                </p>
                <p className="text-sm text-gray-600">Actividades completadas</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnaliticaModal;
