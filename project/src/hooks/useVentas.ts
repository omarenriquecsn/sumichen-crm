import { Pedido } from "../types";
import { esPedidoVenta, montoNetoPedido } from "../utils/pedidos";

 export const useVentas = (pedidos: Pedido[] | undefined) => {
    const anioActual = new Date().getFullYear();

    // Pedidos confirmados (o con devolución parcial)
    const PedidosProcesados =
    (Array.isArray(pedidos) ? pedidos : []).filter((pedido) => esPedidoVenta(pedido)) ?? [];

    // funcion para obtener la cifra de ventas de un mes (solo del año actual)
    const cifraVentasMes = (mes: number) => {
       const VentasdelMes = PedidosProcesados.filter(
           (pedido) => {
               const fecha = new Date(pedido.fecha_creacion);
               return fecha.getMonth() === mes && fecha.getFullYear() === anioActual;
           }
       ) ?? [];

           const totalPedidosMes = VentasdelMes.reduce(
               (total, pedido) => total + montoNetoPedido(pedido),
               0
           );
           return totalPedidosMes;
       };

       // funcion para obtener la cifra de ventas de un mes por precio base
       // (precio_base * cantidad de cada producto) solo del año actual
       const cifraVentasBaseMes = (mes: number) => {
           const VentasdelMes = PedidosProcesados.filter(
               (pedido) => {
                   const fecha = new Date(pedido.fecha_creacion);
                   return fecha.getMonth() === mes && fecha.getFullYear() === anioActual;
               }
           ) ?? [];

           const totalBaseMes = VentasdelMes.reduce(
               (total, pedido) => {
                   const basePedido = Array.isArray(pedido.productos_pedido)
                       ? pedido.productos_pedido.reduce(
                           (acc, pp) =>
                               acc +
                               (Number(pp.precio_base) || 0) *
                                   Math.max(
                                       0,
                                       (Number(pp.cantidad) || 0) -
                                           (Number(pp.cantidad_devuelta) || 0),
                                   ),
                           0
                       )
                       : 0;
                   return total + basePedido;
               },
               0
           );
           return totalBaseMes;
       };

       // Ventas del mes
       const VentasdelMes = cifraVentasMes(new Date().getMonth());

       return {
           PedidosProcesados,
           VentasdelMes,
           cifraVentasMes,
           cifraVentasBaseMes,
       };
   }
