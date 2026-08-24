

import { useSortable } from "@dnd-kit/sortable";
import { Cliente, Oportunidad } from "../../types";
import { Calendar, DollarSign, User } from "lucide-react";
import dayjs from "dayjs";
import { getProbabilityColor } from "../../utils/oportunidades"
// import { useSupabase } from "../../hooks/useSupabase";

// Componente de tarjeta de oportunidad con useSortable
type OportunidadCardProps = {
  oportunidad: Oportunidad;
  cliente: Cliente;
};

 const OportunidadCard = ({
  oportunidad,
  cliente,
}: OportunidadCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: oportunidad.id });
  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  // const supabase = useSupabase();

  // const { mutate: eliminarOportunidad } = supabase.useEliminarOportunidad();

  // const handleDeleteOportunidad = (oportunidad: Oportunidad) => {
  //   eliminarOportunidad(oportunidad.id);
  // };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white border border-gray-200 rounded-lg p-4 mb-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
        isDragging ? "shadow-lg" : ""
      }`}
    >
    
      <div className="space-y-3">
       
        <div>
        
          <h4 className="font-medium text-gray-900 text-sm text-center">
            {cliente?.empresa}
          </h4>
          <div className="flex items-center justify-center space-x-1 mt-1">
            <User className="h-3 w-3 text-gray-400" />
            <span className="text-xs text-gray-500">{cliente?.telefono}</span>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2">
          <div className="flex items-center space-x-1">
            <DollarSign className="h-4 w-4 text-green-600" />
            <span className="font-semibold text-gray-900 text-sm">
              ${Number(oportunidad.valor).toLocaleString()}
            </span>
          </div>
          <span
            className={`text-xs font-medium ${getProbabilityColor(
              oportunidad.probabilidad
            )}`}
          >
            {oportunidad.probabilidad}%
          </span>
        </div>
        <div className="flex items-center justify-center space-x-1">
          <Calendar className="h-3 w-3 text-gray-400" />
          <span className="text-xs text-gray-500">
            {dayjs(oportunidad.fecha_creacion).format("DD/MM/YYYY")}
          </span>
        </div>
        {/* Barra de probabilidad */}
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full ${
              oportunidad.probabilidad >= 80
                ? "bg-green-500"
                : oportunidad.probabilidad >= 60
                ? "bg-yellow-500"
                : oportunidad.probabilidad >= 40
                ? "bg-orange-500"
                : "bg-red-500"
            }`}
            style={{ width: `${oportunidad.probabilidad}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};


export default OportunidadCard;
export type { OportunidadCardProps };