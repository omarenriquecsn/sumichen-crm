import React from "react";
import { Truck } from "lucide-react";
import { InstrumentoStock } from "../../types";

type InstrumentoStockTarjetaProps = {
  stock: InstrumentoStock;
};

export const InstrumentoStockTarjeta: React.FC<
  InstrumentoStockTarjetaProps
> = ({ stock: s }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
          <Truck className="h-5 w-5 text-emerald-600" />
        </div>
        <div className="min-w-0">
          <h4 className="font-medium text-gray-900 truncate">{s.nombre}</h4>
          <p className="text-xs text-gray-500 uppercase">{s.almacen}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
        <div>
          <p className="text-xs text-gray-400">Disponible</p>
          <p className="font-medium text-gray-900">
            {Number(s.cantidad_disponible).toFixed(0)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Total en circulación</p>
          <p className="font-medium text-gray-900">
            {Number(s.cantidad_total).toFixed(0)}
          </p>
        </div>
      </div>
    </div>
  );
};
