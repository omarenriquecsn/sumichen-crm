import React from "react";
import { AlertCircle, Clock, CheckCircle, XCircle, User, Calendar } from "lucide-react";
import dayjs from "dayjs";
import { Ticket } from "../../types";
import { utilsTikets } from "../../utils/tickets";

type TicketTarjetaProps = {
  ticket: Ticket;
  clienteEmpresa?: string;
  clienteEmail?: string;
  clienteTelefono?: string;
  onVer?: () => void;
  onResolver?: () => void;
};

const getEstadoIcon = (estado: string) => {
  switch (estado) {
    case "abierto":
      return <AlertCircle className="h-5 w-5 text-red-600" />;
    case "en_proceso":
      return <Clock className="h-5 w-5 text-yellow-600" />;
    case "resuelto":
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    case "cerrado":
      return <XCircle className="h-5 w-5 text-gray-500" />;
    default:
      return <AlertCircle className="h-5 w-5 text-red-600" />;
  }
};

export const TicketTarjeta: React.FC<TicketTarjetaProps> = ({
  ticket,
  clienteEmpresa,
  clienteEmail,
  clienteTelefono,
  onVer,
  onResolver,
}) => {
  const { getEstadoColor, getPrioridadColor, getCategoriaColor } = utilsTikets();

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
            {getEstadoIcon(ticket.estado)}
          </div>
          <div className="min-w-0">
            <h4 className="font-medium text-gray-900 truncate">{ticket.titulo}</h4>
            <p className="text-sm text-gray-500 line-clamp-2">
              {ticket.descripcion || "Sin descripción"}
            </p>
          </div>
        </div>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize shrink-0 ${getEstadoColor(
            ticket.estado
          )}`}
        >
          {ticket.estado.replace("_", " ")}
        </span>
      </div>

      <div className="text-sm text-gray-600 space-y-1.5 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <User className="h-4 w-4 text-gray-400 shrink-0" />
          <div className="min-w-0">
            <p className="font-medium text-gray-900 truncate">
              {clienteEmpresa || "Cliente"}
            </p>
            {(clienteEmail || clienteTelefono) && (
              <p className="text-xs text-gray-500 truncate">
                {clienteEmail} {clienteTelefono}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize shrink-0 ${getPrioridadColor(
              ticket.prioridad
            )}`}
          >
            {ticket.prioridad}
          </span>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize shrink-0 ${getCategoriaColor(
              ticket.categoria
            )}`}
          >
            {ticket.categoria}
          </span>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
          <span className="truncate">
            {dayjs(ticket.fecha_actualizacion).format("DD/MM/YYYY")}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap border-t border-gray-100 pt-3">
        {onVer && (
          <button
            onClick={onVer}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Ver
          </button>
        )}
        {onResolver && ticket.estado !== "resuelto" && ticket.estado !== "cerrado" && (
          <button
            onClick={onResolver}
            className="text-green-600 hover:text-green-800 text-sm font-medium ml-auto"
          >
            Resolver
          </button>
        )}
      </div>
    </div>
  );
};
