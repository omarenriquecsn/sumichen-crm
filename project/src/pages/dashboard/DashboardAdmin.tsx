import React from "react";
import { Layout } from "../../components/layout/Layout";
import {
  Users,
  // TrendingUp,
  DollarSign,
  Target,
  Award,
  AlertTriangle,
  UserCheck,
  // BarChart3,
} from "lucide-react";
import PanelAdmin from "../../utils/panelAdmin";
import { calculoIncremento } from "../../utils/ventas";
import { typeChange } from "../../constants/typeChange";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useSupabase } from "../../hooks/useSupabase";
import { Meta } from "../../types";
import useVendedores from "../../hooks/useVendedores";
import { ventasPorMes as ventasCadaMes } from "../../utils/ventas";

export const DashboardAdmin: React.FC = () => {
  const {
    cantidadVendedores,
    ventasCerradas,
    CantidadClientesActivos,
    clientesActivos,
    calculoIncrementoVendedores,
    VendedoresTop,
  } = PanelAdmin();

  // incremento ventas
  const incrementoVentas = calculoIncremento(ventasCerradas);

  // incremento clientes
  const incrementoClientes = calculoIncremento(clientesActivos);

  // tickets
  const { data: tickets } = useSupabase().useTickets();

  // tickets abiertos
  const ticketsAbiertos = () => {
    const ticketsAbiertosConst = Array.isArray(tickets)
      ? tickets?.filter((ticket) => ticket.estado === "abierto")
      : [];
    const ticketsUrgentes = Array.isArray(ticketsAbiertosConst)
      ? ticketsAbiertosConst.filter((ticket) => ticket.prioridad === "alta")
      : [];
    return ticketsUrgentes.length;
  };

  //metas
  const { data: metas } = useSupabase().useMetas();
  // metas del mes actual
  const metaMes = Array.isArray(metas)
    ? metas.filter((meta: Meta) => {
        const fechaMeta = meta.mes;
        const meses = [
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
        const mesActual = new Date().getMonth();
        const mesMeta = meses.findIndex((mes) => mes === fechaMeta);
        if (mesMeta === mesActual) {
          return meta;
        }

        return [];
      })
    : [];
  //meta de ventas del mes actual
  const metaVentasMes = metaMes?.reduce(
    (total: number, meta: Meta) => total + Number(meta.objetivo_ventas || 0),
    0
  );

  //pedidos del mes actual
  const { data: pedidos } = useSupabase().usePedidos();

  const pedidosMes = Array.isArray(pedidos)
    ? pedidos.filter((pedido) => {
        const fechaPedido = new Date(pedido.fecha_creacion);
        const mesPedido = fechaPedido.getMonth();
        const mesActual = new Date().getMonth();
        return mesPedido === mesActual;
      })
    : [];

  //total ventas del mes actual
  const totalVentasMes = Array.isArray(pedidosMes) ? pedidosMes.reduce(
    (total, pedido) => total + Number(pedido.total),
    0
  ) : 0;

  //total ventas del mes actual por precio base (precio_base * cantidad) solo pedidos confirmados
  const totalVentasMesPrecioBase = Array.isArray(pedidosMes)
    ? pedidosMes
        .filter((pedido) => pedido.estado === "procesado")
        .reduce((total, pedido) => {
          const basePorPedido = Array.isArray(pedido.productos_pedido)
            ? pedido.productos_pedido.reduce(
                (acc, pp) =>
                  acc +
                  (Number(pp.precio_base) || 0) * (Number(pp.cantidad) || 0),
                0
              )
            : 0;
          return total + basePorPedido;
        }, 0)
    : 0;

  //total ventas del mes actual (precio unitario) solo pedidos confirmados
  const totalVentasMesConfirmadas = Array.isArray(pedidosMes)
    ? pedidosMes
        .filter((pedido) => pedido.estado === "procesado")
        .reduce((total, pedido) => total + Number(pedido.total), 0)
    : 0;

  //porcetaje de la meta mensual
  const porcentajeMeta = () => {
    if (
      totalVentasMes === 0 ||
      totalVentasMes < 0 ||
      totalVentasMes === undefined ||
      !metaVentasMes
    )
      return 0;
    return (totalVentasMes / metaVentasMes) * 100;
  };

  //vendedores
  const { data: vendedores } = useVendedores();

  // cálculo de ventas por vendedor del mes actual
  const calculoVentasVendedores = (vendedorId: string) => {
    return Array.isArray(pedidosMes)
      ? pedidosMes
          .filter((pedido) => pedido.vendedor_id === vendedorId)
          .reduce((total, pedido) => total + Number(pedido.total), 0)
      : 0;
  };

  // calculo de metas por vendedor
  const metaVentasPorVendedor = (vendedorId: string) => {
    return Array.isArray(metaMes)
      ? metaMes.find((meta) => meta.vendedor_id === vendedorId)
          ?.objetivo_ventas || 0
      : 0;
  };

  // cálculo de vendedores con ventas bajas
  const calculoVentasBajasDeVendedores = () => {
    let sumaVendedoresBajos = 0
   if (Array.isArray(vendedores)) {
       vendedores.map(
          (vendedor) =>{
            if (calculoVentasVendedores(vendedor.id) < metaVentasPorVendedor(vendedor.id) * 0.7) {
              sumaVendedoresBajos += 1;
            }
          }
        );
    return sumaVendedoresBajos || 0;
  } }; 

  //Actividades
  const { data: actividades } = useSupabase().useActividades();

  // actividades del mes
  const actividadesDelMes = Array.isArray(actividades)
    ? actividades.filter((actividad) => {
        const fechaActividad = new Date(actividad.fecha);
        const mesActividad = fechaActividad.getMonth();
        const mesActual = new Date().getMonth();
        return mesActividad === mesActual;
      })
    : [];

  // Clientes
  const { data: clientes } = useSupabase().useClientes();

  // Calculo de clientes sin Actividad

  const clientesSinActividad = Array.isArray(clientes)
    ? clientes?.filter((cliente) => {
        const actividadesDelCliente = actividadesDelMes?.filter(
          (actividad) => actividad.cliente_id === cliente.id
        );
        return actividadesDelCliente?.length === 0;
      })
    : [];
    
  const globalStats = [
    {
      title: "Total Vendedores",
      value: cantidadVendedores,
      subtitle: "",
      change: ``,
      changeType: `${typeChange(calculoIncrementoVendedores())}`,
      icon: Users,
      color: "blue",
    },
    {
      title: "Ventas Totales",
      value: ventasCerradas,
      subtitle: "",
      change: ``,
      changeType: `${typeChange(incrementoVentas)}`,
      icon: DollarSign,
      color: "green",
    },
    {
      title: "Ventas del Mes (Precio Base)",
      value: `$${totalVentasMesPrecioBase.toFixed(2)}`,
      subtitle: `Total del mes: $${totalVentasMesConfirmadas.toFixed(2)}`,
      change: "",
      changeType: "",
      icon: DollarSign,
      color: "green",
    },
    {
      title: "Clientes Activos",
      value: CantidadClientesActivos,
      subtitle: "",
      change: ``,
      changeType: `${typeChange(incrementoClientes)}`,
      icon: UserCheck,
      color: "purple",
    },
    {
      title: "Meta Global",
      value: `%${porcentajeMeta().toFixed(2)}`,
      subtitle: "",
      change: "",
      changeType: "" as const,
      icon: Target,
      color: "",
    },
  ];

  const topVendedores = [...VendedoresTop];

  const alertas = [
    ...(calculoVentasBajasDeVendedores() as number > 0
      ? [
          {
            id: 1,
            tipo: "meta",
            mensaje: `${
              calculoVentasBajasDeVendedores() as number > 1
                ? `${calculoVentasBajasDeVendedores()} vendedores estan`
                : `${calculoVentasBajasDeVendedores()} vendedor esta`
            } por debajo del 70% de su meta mensual`,
            urgencia: "alta",
          },
        ]
      : []),
    ...(clientesSinActividad.length > 0
      ? [
          {
            id: 2,
            tipo: "actividad",
            mensaje: `${clientesSinActividad.length} clientes sin actividad en los últimos 15 días`,
            urgencia: "media",
          },
        ]
      : []),
    ...(ticketsAbiertos() > 0
      ? [
          {
            id: 3,
            tipo: "ticket",
            mensaje: `${ticketsAbiertos()} tickets de soporte pendientes de resolución`,
            urgencia: "alta",
          },
        ]
      : []),
  ];

  const mesPasado = new Date();
  mesPasado.setMonth(mesPasado.getMonth() - 1);

  const nombreMesPasado = mesPasado.toLocaleString("default", {
    month: "long",
  });
  const mesAntePasado = new Date();
  mesAntePasado.setMonth(mesAntePasado.getMonth() - 2);

  const nombreMesAntePasado = mesAntePasado.toLocaleString("default", {
    month: "long",
  });

  const ventasPorMes = [
    {
      mes: nombreMesAntePasado,
      ventas: ventasCadaMes(pedidos, new Date().getMonth() - 2).toFixed(2),
    },
    {
      mes: nombreMesPasado,
      ventas: ventasCadaMes(pedidos, new Date().getMonth() - 1).toFixed(2),
    },
    {
      mes: new Date().toLocaleString("default", { month: "long" }),
      ventas: ventasCadaMes(pedidos, new Date().getMonth()).toFixed(2),
    },
    // ...etc
  ];

  const rendimientoVendedores = [
    ...(Array.isArray(vendedores) ? vendedores : []).map((vendedor) => ({
      nombre: vendedor.nombre,
      ventas: calculoVentasVendedores(vendedor.id).toFixed(2),
    })),
   
    // ...etc
  ];

  return (
    <Layout
      title="Panel de Administración"
      subtitle="Vista general del rendimiento del equipo de ventas"
    >
      <div className="space-y-6">
        {/* Estadísticas globales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {globalStats.map((stat) => (
            <div
              key={stat.title}
              className="bg-white rounded-xl shadow-sm p-6 border border-gray-100"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {Array.isArray(stat.value) ? stat.value.length : stat.value}
                  </p>
                  {stat.subtitle ? (
                    <p className="text-sm text-gray-500 mt-1">
                      {stat.subtitle}
                    </p>
                  ) : null}
                  <p
                    className={`text-sm mt-2 ${
                      stat.changeType === "positive"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {stat.change === "" ? "" : `${stat.change} vs mes anterior`}
                  </p>
                </div>
                <div
                  className={`p-3 rounded-full ${
                    stat.color === "blue"
                      ? "bg-blue-100"
                      : stat.color === "green"
                      ? "bg-green-100"
                      : stat.color === "purple"
                      ? "bg-purple-100"
                      : "bg-orange-100"
                  }`}
                >
                  <stat.icon
                    className={`h-6 w-6 ${
                      stat.color === "blue"
                        ? "text-blue-600"
                        : stat.color === "green"
                        ? "text-green-600"
                        : stat.color === "purple"
                        ? "text-purple-600"
                        : "text-orange-600"
                    }`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top vendedores */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Top Vendedores
              </h3>
              <Award className="h-5 w-5 text-yellow-500" />
            </div>
            <div className="space-y-4">
              {topVendedores.map((vendedor, index) => (
                <div
                  key={vendedor.id}
                  className="flex items-center space-x-4 p-3 hover:bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <span
                      className={`text-sm font-bold ${
                        index === 0
                          ? "text-yellow-600"
                          : index === 1
                          ? "text-gray-500"
                          : index === 2
                          ? "text-orange-600"
                          : "text-gray-400"
                      }`}
                    >
                      #{index + 1}
                    </span>
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-sm">
                        {vendedor.avatar}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {vendedor.nombre}
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>${Number(vendedor.ventas)}</span>
                      <span>•</span>
                      <span>{vendedor.clientes} clientes</span>
                      <span>•</span>
                      <span
                        className={`font-medium ${
                          Number(vendedor.meta) >= 90
                            ? "text-green-600"
                            : Number(vendedor.meta) >= 75
                            ? "text-yellow-600"
                            : "text-red-600"
                        }`}
                      >
                        {vendedor.meta}% meta
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Alertas y notificaciones */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Alertas del Sistema
              </h3>
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div className="space-y-4">
              {alertas.map((alerta) => (
                <div
                  key={alerta.id}
                  className={`p-4 rounded-lg border-l-4 ${
                    alerta.urgencia === "alta"
                      ? "bg-red-50 border-red-400"
                      : "bg-yellow-50 border-yellow-400"
                  }`}
                >
                  <p
                    className={`font-medium ${
                      alerta.urgencia === "alta"
                        ? "text-red-800"
                        : "text-yellow-800"
                    }`}
                  >
                    {alerta.mensaje}
                  </p>
                  <p
                    className={`text-sm mt-1 ${
                      alerta.urgencia === "alta"
                        ? "text-red-600"
                        : "text-yellow-600"
                    }`}
                  >
                    Urgencia: {alerta.urgencia}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Gráficos de rendimiento */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Ventas por Mes
            </h3>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={ventasPorMes}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="ventas" fill="#4F46E5" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Rendimiento por Vendedor
            </h3>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={rendimientoVendedores}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nombre" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="ventas" fill="#16A34A" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
