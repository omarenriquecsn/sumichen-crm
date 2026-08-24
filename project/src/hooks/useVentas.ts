import { Pedido } from "../types";

 
 export const useVentas = (pedidos: Pedido[] | undefined) => {
     
    
     // Pedidos Procesados
     const PedidosProcesados =
     (Array.isArray(pedidos) ? pedidos : []).filter((pedido) => pedido.estado === "procesado") ?? [];
     
     // Ventas del mes
     const VentasdelMes =
     PedidosProcesados.filter(
         (pedido) =>
            new Date(pedido.fecha_creacion).getMonth() === new Date().getMonth()
        ) ?? [];

        
        // funcion para obtener la cifra de ventas del mes
        const cifraVentasMes = (mes: number) => {
           const VentasdelMes =
     PedidosProcesados.filter(
         (pedido) =>
            new Date(pedido.fecha_creacion).getMonth() === mes
        ) ?? [];

            const totalPedidosMes = VentasdelMes.reduce(
                (total, pedido) => total + Number(pedido.total),
                0
            );
            return totalPedidosMes;
        };
        return {
            PedidosProcesados,
            VentasdelMes,
            cifraVentasMes,
        };
    }