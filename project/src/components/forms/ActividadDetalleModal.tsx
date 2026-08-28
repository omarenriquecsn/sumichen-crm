import React from "react";
import dayjs from "dayjs";
import {
  Actividad,
  Reunion,
  Cliente,
  Vendedor,
} from "../../types";
import {
  Calendar,
  Phone,
  Mail,
  MapPin,
  X,
} from "lucide-react";

type ActividadSeleccionada = {
  id: string;
  origen: "reunion" | "actividad";
};

type ActividadDetalleModalProps = {
  item: ActividadSeleccionada | null;
  actividades: Actividad[];
  reuniones: Reunion[];
  clientes: Cliente[];
  vendedores: Vendedor[];
  isOpen: boolean;
  onClose: () => void;
};

export const ActividadDetalleModal: React.FC<ActividadDetalleModalProps> = ({
  item,
  actividades,
  reuniones,
  clientes,
  vendedores,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !item) return null;

  const isReunion = item.origen === "reunion";
  const reunion = isReunion ? reuniones.find((r) => r.id === item.id) : null;
  const actividad = !isReunion ? actividades.find((a) => a.id === item.id) : null;

  if (!reunion && !actividad) return null;

  const cliente = clientes.find(
    (c) => c.id === (isReunion ? reunion?.cliente_id : actividad?.cliente_id)
  );
  const vendedor = vendedores.find(
    (v) => v.id === (isReunion ? reunion?.vendedor_id : actividad?.vendedor_id)
  );

  const titulo = isReunion ? reunion?.titulo : actividad?.titulo;
  const tipo = isReunion ? reunion?.tipo : actividad?.tipo;
  const descripcion = isReunion ? reunion?.descripcion : actividad?.descripcion;
  const estado = isReunion ? reunion?.estado : actividad?.completado ? "completada" : "pendiente";
  const ubicacion = isReunion ? reunion?.ubicacion : null;

  // Fechas
  const fechaInicio = isReunion ? reunion?.fecha_inicio : actividad?.fecha;
  const fechaFin = isReunion ? reunion?.fecha_fin : actividad?.fecha_vencimiento;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-gray-400 rounded-full hover:bg-gray-200 hover:text-gray-600 focus:outline-none"
          aria-label="Cerrar modal"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="space-y-6 mt-2">
          <div className="flex items-center space-x-4">
            <div
              className={`p-3 rounded-full ${
                tipo === "reunion" || isReunion
                  ? "bg-blue-100"
                  : tipo === "llamada"
                  ? "bg-green-100"
                  : "bg-purple-100"
              }`}
            >
              {tipo === "reunion" || isReunion ? (
                <Calendar className="h-6 w-6 text-blue-600" />
              ) : tipo === "llamada" ? (
                <Phone className="h-6 w-6 text-green-600" />
              ) : (
                <Mail className="h-6 w-6 text-purple-600" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{titulo}</h2>
              <p className="text-sm uppercase tracking-wider text-gray-500 font-semibold">
                {isReunion ? "Reunión / Visita" : `Actividad: ${tipo}`}
              </p>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Descripción</p>
              <p className="text-gray-800 mt-1 whitespace-pre-wrap">
                {descripcion || "Sin descripción"}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-200">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Fecha y Hora</p>
                <p className="text-sm font-medium text-gray-800 mt-1">
                  {fechaInicio
                    ? dayjs(fechaInicio).format("DD/MM/YYYY HH:mm")
                    : "No especificada"}
                </p>
              </div>
              {fechaFin && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">
                    {isReunion ? "Fecha Fin" : "Fecha Vencimiento"}
                  </p>
                  <p className="text-sm font-medium text-gray-800 mt-1">
                    {dayjs(fechaFin).format("DD/MM/YYYY HH:mm")}
                  </p>
                </div>
              )}
            </div>

            {ubicacion && (
              <div className="pt-2 border-t border-gray-200 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">{ubicacion}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Estado</p>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 capitalize ${
                  estado === "completada" || estado === "resuelto"
                    ? "bg-green-100 text-green-800"
                    : estado === "pendiente" || estado === "programada"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {String(estado).replace("_", " ")}
              </span>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Empresa / Cliente</p>
              <p className="text-sm font-medium text-gray-800 mt-1">
                {cliente?.empresa || "Sin cliente"}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Vendedor</p>
              <p className="text-sm font-medium text-gray-800 mt-1">
                {vendedor?.nombre || "Sin asignar"}
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-100">
            <button
              onClick={onClose}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
