import useVendedores from "../hooks/useVendedores";
import { useSupabase } from "../hooks/useSupabase";
import { Meta, Vendedor } from "../types";

const PanelAdmin = () => {
  const { data: pedidos } = useSupabase().usePedidos();
  const { data: vendedores } = useVendedores();
  const { data: clientes } = useSupabase().useClientes();

  // Calculo de clientes activos
  const clientesActivos = Array.isArray(clientes)
    ? clientes.filter((cliente) => cliente.estado === "activo")
    : [];

  // Calculo de ventas cerradas
  const ventasCerradas = Array.isArray(pedidos)
    ? pedidos.filter((pedido) => pedido.estado === "procesado")
    : [];

  // Calculo de cantidad clientes activos
  const CantidadClientesActivos = Array.isArray(clientes)
    ? clientes.filter((cliente) => cliente.estado === "activo").length
    : 0;

  // Calculo de valor ventas cerradas
  const valorVentasCerradas = Array.isArray(pedidos)
    ? pedidos
        .filter((pedido) => pedido.estado === "procesado")
        .reduce((total, pedido) => total + pedido.total, 0)
    : 0;

  // Calculo de pedidos por vendedor
  const pedidosMes = Array.isArray(pedidos)
    ? pedidos.filter((pedido) => {
        const fechaPedido = new Date(pedido.fecha_creacion);
        const mesPedido = fechaPedido.getMonth();
        const mesActual = new Date().getMonth();
        return mesPedido === mesActual;
      })
    : [];
  const calculoVentasVendedores = (vendedorId: string) => {
    return Array.isArray(pedidosMes)
      ? pedidosMes
          .filter((pedido) => pedido.vendedor_id === vendedorId)
          .reduce((total, pedido) => total + Number(pedido.total), 0)
      : 0;
  };

  // Calculo de cantidad vendedores
  const cantidadVendedores = Array.isArray(vendedores) ? vendedores.length : 0;

  // Calculo de cantidad clientes
  const cantidadClientes = Array.isArray(clientes) ? clientes.length : 0;

  // Calculo de incremento vendedores
  const calculoIncrementoVendedores = () => {
    const vendedoresAnteriores = Array.isArray(vendedores)
      ? vendedores.map(
          (vendedor: Vendedor) =>
            new Date(vendedor.fecha_creacion).getMonth() ===
            new Date().getMonth() - 1
        )
      : [];

    // Vendedores actuales
    const vendedoresActuales = Array.isArray(vendedores)
      ? vendedores.map(
          (vendedor: Vendedor) =>
            new Date(vendedor.fecha_creacion).getMonth() ===
            new Date().getMonth()
        )
      : [];

    // Calculo de clientes por vendedor

    //  Calculo de incremento vendedores
    const restaVendedores =
      vendedoresActuales.length - vendedoresAnteriores.length;
    const incremento = restaVendedores > 0 ? restaVendedores : 0;
    return incremento;
  };

  const clientesPorVendedor = (vendedorId: string) => {
    return Array.isArray(clientes)
      ? clientes.filter((cliente) => cliente.vendedor_id === vendedorId)
      : [];
  };

  //Calculo metas Por vendedor
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
  const metaVentasPorVendedor = (vendedorId: string) => {
    return Array.isArray(metaMes)
      ? metaMes.find((meta) => meta.vendedor_id === vendedorId)
          ?.objetivo_ventas || 0
      : 0;
  };
  // Top Vendedores

  const topVendedores = Array.isArray(vendedores)
    ? vendedores.map((vendedor, index) => ({
        id: index + 1,
        nombre: `${vendedor.nombre} ${vendedor.apellido}`,
        ventas: Number(calculoVentasVendedores(vendedor.id).toFixed(2)) || 0,
        meta:
          metaVentasPorVendedor(vendedor.id) === 0 ||
          calculoVentasVendedores(vendedor.id) === 0
            ? 0
            : (
                (calculoVentasVendedores(vendedor.id) /
                  metaVentasPorVendedor(vendedor.id)) *
                100
              ).toFixed(2),
        clientes: Array.isArray(clientes)
          ? clientesPorVendedor(vendedor.id).length
          : 0,
        avatar: vendedor.nombre.charAt(0) + vendedor.apellido.charAt(0),
      }))
    : [];

  const VendedoresTop = Array.isArray(topVendedores)
    ? topVendedores.sort((a, b) => b.ventas - a.ventas).slice(0, 6)
    : [];
  return {
    cantidadVendedores,
    ventasCerradas,
    cantidadClientes,
    CantidadClientesActivos,
    clientesActivos,
    valorVentasCerradas,
    calculoIncrementoVendedores,
    VendedoresTop,
  };
};

export default PanelAdmin;
