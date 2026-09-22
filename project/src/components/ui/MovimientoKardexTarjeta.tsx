import React from "react";
import { Boxes } from "lucide-react";
import { MovimientoInventario } from "../../types";

type MovimientoKardexTarjetaProps = {
  movimiento: MovimientoInventario;
};

export const MovimientoKardexTarjeta: React.FC<
  MovimientoKardexTarjetaProps
> = ({ movimiento: m }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
            <Boxes className="h-5 w-5 text-blue-600" />
          </div>
          <div className="min-w-0">
            <h4 className="font-medium text-gray-900 truncate">
              {m.producto?.nombre ?? m.producto_id.slice(0, 8)}
            </h4>
            <p className="text-xs text-gray-500">
              {new Date(m.fecha_creacion).toLocaleString("es-VE")}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize shrink-0 bg-gray-100 text-gray-700">
          {m.tipo}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
        <div>
          <p className="text-xs text-gray-400">Lote</p>
          <p className="truncate">{m.lote?.codigo_lote ?? "-"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Almacén</p>
          <p className="uppercase">{m.almacen ?? "-"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Cantidad</p>
          <p className="font-medium text-gray-900">
            {Number(m.cantidad).toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Saldo</p>
          <p className="font-medium text-gray-900">
            {Number(m.saldo_resultante).toFixed(2)}
          </p>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-2">
        <p className="text-xs text-gray-400">Motivo</p>
        <p className="text-sm text-gray-600">
          {m.motivo_categoria ?? m.observacion ?? "-"}
        </p>
      </div>
    </div>
  );
};
