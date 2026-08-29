import React from "react";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Video,
  Phone,
  Users,
} from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { Reunion } from "../../types";
import { getEstadoColor } from "../../utils/reuniones";

type ReunionTarjetaProps = {
  reunion: Reunion;
  clienteEmpresa?: string;
  clienteTelefono?: string;
  onVer?: () => void;
  onEditar?: () => void;
  onCancelar?: () => void;
};

const getTipoIcon = (tipo: string) => {
  switch (tipo) {
    case "virtual":
      return <Video className="h-5 w-5 text-blue-600" />;
    case "telefonica":
      return <Phone className="h-5 w-5 text-blue-600" />;
    case "presencial":
      return <Users className="h-5 w-5 text-blue-600" />;
    default:
      return <Calendar className="h-5 w-5 text-blue-600" />;
  }
};

export const ReunionTarjeta: React.FC<ReunionTarjetaProps> = ({
  reunion,
  clienteEmpresa,
  clienteTelefono,
  onVer,
  onEditar,
  onCancelar,
}) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
            {getTipoIcon(reunion.tipo)}
          </div>
          <div className="min-w-0">
            <h4 className="font-medium text-gray-900 truncate">
              {reunion.titulo}
            </h4>
            <p className="text-sm text-gray-500 line-clamp-2">
              {reunion.descripcion || "Sin descripción"}
            </p>
          </div>
        </div>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize shrink-0 ${getEstadoColor(
            reunion.estado
          )}`}
        >
          {reunion.estado}
        </span>
      </div>

      <div className="text-sm text-gray-600 space-y-1.5 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <User className="h-4 w-4 text-gray-400 shrink-0" />
          <div className="min-w-0">
            <p className="font-medium text-gray-900 truncate">
              {clienteEmpresa || "Cliente no encontrado"}
            </p>
            {clienteTelefono && (
              <p className="text-xs text-gray-500 truncate">
                {clienteTelefono}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
          <span className="truncate capitalize">
            {dayjs(reunion.fecha_inicio)
              .locale("es")
              .format("dddd D MMMM YYYY")}
          </span>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <Clock className="h-4 w-4 text-gray-400 shrink-0" />
          <span className="truncate">
            {dayjs(reunion.fecha_inicio).locale("es").format("HH:mm a")} -{" "}
            {dayjs(reunion.fecha_fin).locale("es").format("HH:mm a")}
          </span>
        </div>
        {reunion.ubicacion && (
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
            <span className="truncate">{reunion.ubicacion}</span>
          </div>
        )}
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
        {onEditar && (
          <button
            onClick={onEditar}
            className="text-green-600 hover:text-green-800 text-sm font-medium"
          >
            Editar
          </button>
        )}
        {onCancelar && reunion.estado !== "cancelada" && (
          <button
            onClick={onCancelar}
            className="text-red-600 hover:text-red-800 text-sm font-medium ml-auto"
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
};
