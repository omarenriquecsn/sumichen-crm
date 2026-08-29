import { Pedido } from "../types";

 export const useVentas = (pedidos: Pedido[] | undefined) => {
    const anioActual = new Date().getFullYear();

    // Pedidos Procesados
    const PedidosProcesados =
    (Array.isArray(pedidos) ? pedidos : []).filter((pedido) => pedido.estado === "procesado") ?? [];

    // funcion para obtener la cifra de ventas de un mes (solo del año actual)
    const cifraVentasMes = (mes: number) => {
       const VentasdelMes = PedidosProcesados.filter(
           (pedido) => {
               const fecha = new Date(pedido.fecha_creacion);
               return fecha.getMonth() === mes && fecha.getFullYear() === anioActual;
           }
       ) ?? [];

           const totalPedidosMes = VentasdelMes.reduce(
               (total, pedido) => total + Number(pedido.total),
               0
           );
           return totalPedidosMes;
       };

       // Ventas del mes
       const VentasdelMes = cifraVentasMes(new Date().getMonth());

       return {
           PedidosProcesados,
           VentasdelMes,
           cifraVentasMes,
       };
   }
