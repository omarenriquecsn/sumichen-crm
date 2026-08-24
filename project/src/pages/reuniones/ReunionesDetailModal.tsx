import { useState } from "react";
import { toast } from "react-toastify";
import { useSupabase } from "../../hooks/useSupabase";
import {
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  User,
  Calendar,
} from "lucide-react";
import { ConfirmarAccionToast } from "../../components/ui/ConfirmarAccionToast";
import dayjs from "dayjs";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { ReunionCalendario } from "../../types";
interface ReunionProps {
  vendedor: SupabaseUser;
  reunion: ReunionCalendario;
  isOpen: boolean;
  onClose: () => void;
}

export const ReunionesDetailModal = ({
  vendedor,
  reunion,
  isOpen,
  onClose,
}: ReunionProps) => {
  const supabase = useSupabase();
  const currentUser = vendedor;
  const [mostrarModalConfirmacion, setMostrarModalConfirmacion] =
    useState(false);

  // reunioness
  const {
    data: reuniones,
    isLoading: loadingReuniones,
    error: errorReuniones,
  } = supabase.useReuniones();

  // clientes
  const {
    data: clientesDB,
    isLoading: loadingClientes,
    error: errorClientes,
  } = supabase.useClientes();

  const clientes = Array.isArray(clientesDB)
    ? clientesDB.filter((c) => c.vendedor_id === currentUser?.id)
    : [];

  // Actualizar reunion
  const { mutate: actualizarReunion, isPending: isUpdatingReunion } =
    supabase.useActualizarReunion();

  const prepararResolverReunion = () => {
    if (!reunion) return;
    setMostrarModalConfirmacion(true);
  };

  const handleResolverReunion = () => {
    if (!currentUser) {
      toast.error("Debes iniciar sesión para realizar esta acción.");
      return;
    }
    if (!reunion) {
      toast.error("No se pudo encontrar la reunión para actualizar.");
      return;
    }

    actualizarReunion(
      {
        ReunionData: {
          id: reunion.id,
          estado: "completada",
        },
        currentUser,
      },
      {
        onSuccess: () => {
          toast.success("¡Reunion marcado como completado!");
          setMostrarModalConfirmacion(false);
        },
        onError: (error) => {
          toast.error(`Error al resolver la reunion: ${error.message}`);
          setMostrarModalConfirmacion(false);
        },
      }
    );
  };

  if (errorReuniones || errorClientes) {
    toast.error("Error al cargar la reunion");
    return;
  }

  if (loadingReuniones || loadingClientes) {
    return <p>Cargando...</p>;
  }

  if (!reuniones || !clientes) {
    return;
  }

  const clientesMap = new Map(clientes.map((cliente) => [cliente.id, cliente]));

  if (!reunion) {
    return;
  }

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case "abierto":
        return "bg-red-100 text-red-800";
      case "en_proceso":
        return "bg-yellow-100 text-yellow-800";
      case "resuelto":
        return "bg-green-100 text-green-800";
      case "cerrado":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getEstadoIcon = (estado: string) => {
    const iconProps = { className: "h-8 w-8" };
    switch (estado) {
      case "abierto":
        return <AlertCircle {...iconProps} />;
      case "en_proceso":
        return <Clock {...iconProps} />;
      case "resuelto":
        return <CheckCircle {...iconProps} />;
      case "cerrado":
        return <XCircle {...iconProps} />;
      default:
        return <AlertCircle {...iconProps} />;
    }
  };

  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 "
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-xl shadow-2xl p-6 max-w-5xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón de cerrar */}
        <button
          onClick={onClose}
          className=" absolute top-2 right-2 p-1 text-gray-400 rounded-full hover:bg-gray-200 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          aria-label="Cerrar modal"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        <div className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Columna principal */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div
                      className={`p-3 rounded-full ${getEstadoColor(
                        reunion.estado
                      )}`}
                    >
                      {getEstadoIcon(reunion.estado)}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        {reunion.titulo}
                      </h2>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${getEstadoColor(
                      reunion.estado
                    )}`}
                  >
                    {reunion.estado.replace("_", " ")}
                  </span>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    Descripción
                  </h4>
                  <p className="text-gray-600 whitespace-pre-wrap">
                    {reunion.descripcion}
                  </p>
                </div>
              </div>
            </div>

            {/* Panel lateral */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Detalles
                </h3>
                <div className="space-y-4 text-sm">
                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-gray-500">Cliente</p>
                      <p className="font-medium text-gray-900">
                        {clientesMap.get(reunion.cliente_id)?.empresa}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-gray-500">Creado</p>
                      <p className="font-medium text-gray-900">
                        {dayjs(reunion.fecha_creacion).format(
                          "DD/MM/YYYY HH:mm"
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-gray-500">Inicio</p>
                      <p className="font-medium text-gray-900">
                        {dayjs(reunion.fecha_inicio).format(
                          "DD/MM/YYYY HH:mm"
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-gray-500">Fin</p>
                      <p className="font-medium text-gray-900">
                        {dayjs(reunion.fecha_fin).format(
                          "DD/MM/YYYY HH:mm"
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Acciones
                </h3>
                <div className="space-y-3">
                  {reunion.estado !== "completada" && (
                    <button
                      onClick={prepararResolverReunion}
                      disabled={isUpdatingReunion}
                      className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2 disabled:bg-green-300 disabled:cursor-not-allowed"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>
                        {isUpdatingReunion
                          ? "Completando..."
                          : "Marcar como Completada"}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          <ConfirmarAccionToast
            visible={mostrarModalConfirmacion}
            setVisible={setMostrarModalConfirmacion}
            onConfirm={handleResolverReunion}
            texto="¿Estás seguro de que deseas resolver esta reunión?"
            posicion="bottom-right"
            tema="dark"
            modoModal={true}
          />
        </div>
      </div>
    </div>
  );
};
