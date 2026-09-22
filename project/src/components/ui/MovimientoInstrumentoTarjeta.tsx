import React from "react";
import { Truck } from "lucide-react";
import { MovimientoInstrumento } from "../../types";

type MovimientoInstrumentoTarjetaProps = {
  movimiento: MovimientoInstrumento;
};

export const MovimientoInstrumentoTarjeta: React.FC<
  MovimientoInstrumentoTarjetaProps
> = ({ movimiento: m }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
            <Truck className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <h4 className="font-medium text-gray-900 truncate">
              {m.tipo_instrumento?.nombre ?? "-"}
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

      <div className="grid grid-cols-3 gap-2 text-sm text-gray-600">
        <div>
          <p className="text-xs text-gray-400">Almacén</p>
          <p className="uppercase">{m.almacen ?? "-"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Cantidad</p>
          <p className="font-medium text-gray-900">
            {Number(m.cantidad).toFixed(0)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Saldo</p>
          <p className="font-medium text-gray-900">
            {Number(m.saldo_resultante).toFixed(0)}
          </p>
        </div>
      </div>
    </div>
  );
};
