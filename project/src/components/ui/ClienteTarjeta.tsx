import React from "react";
import {
  Phone,
  Mail,
  DollarSign,
  IdCard,
  User2,
  UserCheck,
} from "lucide-react";
import { Cliente } from "../../types";
import { getEtapaColor, getEstadoColor } from "../../utils/clientes";

type ClienteTarjetaProps = {
  cliente: Cliente;
  rol?: string;
  vendedorNombre?: string;
  ventas?: number;
  onClick?: () => void;
};

export const ClienteTarjeta: React.FC<ClienteTarjetaProps> = ({
  cliente,
  rol,
  vendedorNombre,
  ventas = 0,
  onClick,
}) => {
  const nombreCompleto = `${cliente.nombre} ${cliente.apellido}`;
  const inicial = cliente.empresa?.[0]?.toUpperCase() || "E";

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-gray-200 p-4 space-y-3 transition-colors ${
        onClick ? "cursor-pointer hover:border-blue-300 active:bg-blue-50/50" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
            <span className="text-blue-600 font-semibold">{inicial}</span>
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 truncate">
              {cliente.empresa || "Empresa"}
            </p>
            <p className="text-xs text-gray-500 truncate flex items-center gap-1 mt-0.5">
              {rol === "admin" ? (
                <>
                  <UserCheck className="h-3 w-3 text-blue-600" />
                  {vendedorNombre || "Sin vendedor"}
                </>
              ) : (
                <>
                  <IdCard className="h-3 w-3" />
                  {cliente.rif}
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getEstadoColor(
              cliente.estado
            )}`}
          >
            {cliente.estado}
          </span>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getEtapaColor(
              cliente.etapa_venta
            )}`}
          >
            {cliente.etapa_venta}
          </span>
        </div>
      </div>

      <div className="text-sm text-gray-600 space-y-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <User2 className="h-4 w-4 text-blue-600 shrink-0" />
          <span className="truncate">{nombreCompleto}</span>
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          <Mail className="h-4 w-4 shrink-0" />
          <span className="truncate">{cliente.email}</span>
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          <Phone className="h-4 w-4 shrink-0" />
          <span className="truncate">{cliente.telefono}</span>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 pt-2">
        <span className="text-xs text-gray-500">Total vendido</span>
        <span className="font-medium text-gray-900 flex items-center gap-1">
          <DollarSign className="h-4 w-4 text-green-600" />
          ${(Number(ventas) || 0).toFixed(2)}
        </span>
      </div>
    </div>
  );
};
