import React from "react";
import { User } from "lucide-react";
import { ClienteInstrumentos } from "../../types";

type ClienteInstrumentosTarjetaProps = {
  cliente: ClienteInstrumentos;
};

export const ClienteInstrumentosTarjeta: React.FC<
  ClienteInstrumentosTarjetaProps
> = ({ cliente: c }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
          <User className="h-5 w-5 text-blue-600" />
        </div>
        <h4 className="font-medium text-gray-900 truncate">
          {c.cliente_nombre}
        </h4>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
        <div>
          <p className="text-xs text-gray-400">En cliente</p>
          <p className="font-medium text-gray-900">
            {Number(c.en_cliente).toFixed(0)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400">En tránsito</p>
          <p className="font-medium text-gray-900">
            {Number(c.en_transito).toFixed(0)}
          </p>
        </div>
      </div>

      {c.detalle.length > 0 && (
        <div className="border-t border-gray-100 pt-2">
          <p className="text-xs text-gray-400">Detalle</p>
          <p className="text-sm text-gray-600">
            {c.detalle
              .map(
                (d) =>
                  `${d.nombre}: ${d.en_cliente} cliente${
                    d.en_transito ? `/${d.en_transito} tránsito` : ""
                  }`,
              )
              .join(" · ")}
          </p>
        </div>
      )}
    </div>
  );
};
