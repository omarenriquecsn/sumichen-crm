import React from "react";
import { Target } from "lucide-react";
import { Cliente, Pedido } from "../../types";

type PropsProyeccionVentas = {
  cliente: Cliente;
  pedidos: Pedido[];
};

const fmtMonto = (n: number) =>
  n.toLocaleString("es-VE", { maximumFractionDigits: 2 });

/**
 * Barra de "Proyección de ventas": compara las ventas completadas del cliente
 * (pedidos con estado 'procesado') a PRECIO BASE (precio_base * cantidad)
 * contra su proyección_venta.
 * Si el cliente no tiene proyección (null/0/negativa) muestra un aviso.
 */
export const ProyeccionVentas: React.FC<PropsProyeccionVentas> = ({
  cliente,
  pedidos,
}) => {
  const proyeccion = Number(cliente.proyeccion_venta ?? 0);

  if (!proyeccion || proyeccion <= 0) {
    return (
      <div>
        <p className="text-sm text-gray-500 flex items-center gap-1.5">
          <Target className="h-4 w-4 text-blue-600" />
          Proyección de ventas
        </p>
        <p className="text-sm text-gray-500 break-words">
          Sin proyección asignada
        </p>
      </div>
    );
  }

  const ventasProcesadas = (Array.isArray(pedidos) ? pedidos : [])
    .filter((p) => p.cliente_id === cliente.id && p.estado === "procesado")
    .reduce((total, p) => {
      const basePorPedido = Array.isArray(p.productos_pedido)
        ? p.productos_pedido.reduce(
            (acc, pp) =>
              acc + (Number(pp.precio_base) || 0) * (Number(pp.cantidad) || 0),
            0
          )
        : 0;
      return total + basePorPedido;
    }, 0);

  const porcentaje = (ventasProcesadas / proyeccion) * 100;
  const anchoBarra = Math.min(porcentaje, 100);
  const porcentajeMostrado = Number(porcentaje.toFixed(2));

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-500 flex items-center gap-1.5">
          <Target className="h-4 w-4 text-blue-600" />
          Proyección de ventas
        </p>
        <span className="text-sm font-semibold text-blue-700">
          {porcentajeMostrado.toFixed(2)}%
        </span>
      </div>

      <div className="flex flex-wrap items-baseline gap-x-1.5 mb-2">
        <span className="text-xs text-gray-500">
          Vendido (completado):
        </span>
        <span className="text-sm font-medium text-gray-900">
          ${fmtMonto(ventasProcesadas)}
        </span>
        <span className="text-xs text-gray-400">
          de ${fmtMonto(proyeccion)}
        </span>
      </div>

      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            porcentaje >= 100 ? "bg-green-500" : "bg-blue-500"
          }`}
          style={{ width: `${anchoBarra}%` }}
        />
      </div>
    </div>
  );
};
