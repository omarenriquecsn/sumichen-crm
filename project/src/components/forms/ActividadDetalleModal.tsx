import React, { useEffect, useState } from "react";
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
  Pencil,
  Loader2,
} from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "../../context/useAuth";
import { useSupabase } from "../../hooks/useSupabase";

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

const pad = (n: number) => String(n).padStart(2, "0");

// Convierte una fecha a formato local para input datetime-local (sin desfase UTC)
const aDateTimeLocal = (fecha: Date | string | undefined | null): string => {
  if (!fecha) return "";
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
  const supabase = useSupabase();
  const { currentUser } = useAuth();
  const { mutateAsync: actualizarActividad } = supabase.useActualizarActividad();
  const { mutateAsync: actualizarReunion } = supabase.useActualizarReunion();

  const [modoEdicion, setModoEdicion] = useState(false);
  const [guardando, setGuardando] = useState(false);
  // Reunión: inicio y fin
  const [fechaInicioEdit, setFechaInicioEdit] = useState("");
  const [fechaFinEdit, setFechaFinEdit] = useState("");
  // Actividad: nueva fecha
  const [fechaEdit, setFechaEdit] = useState("");

  useEffect(() => {
    setModoEdicion(false);
    setGuardando(false);
  }, [item?.id, item?.origen, isOpen]);

  if (!isOpen || !item) return null;

  const isReunion = item.origen === "reunion";
  const reunion = isReunion
    ? reuniones.find((r) => r.id === item.id) ?? null
    : null;
  const actividad = !isReunion
    ? actividades.find((a) => a.id === item.id) ?? null
    : null;

  if (!reunion && !actividad) return null;

  // Si la actividad abierta es el duplicado automático de una reunión
  // (tipo 'reunion' con id_tipo_actividad), se reagenda la reunión REAL.
  const reunionVinculada =
    !isReunion && actividad?.tipo === "reunion" && actividad.id_tipo_actividad
      ? reuniones.find((r) => r.id === actividad.id_tipo_actividad) ?? null
      : null;

  const reunionObjetivo = reunion ?? reunionVinculada;
  const actividadObjetivo = reunionObjetivo
    ? null
    : !isReunion
    ? actividad
    : null;

  const cliente = clientes.find(
    (c) => c.id === (isReunion ? reunion?.cliente_id : actividad?.cliente_id)
  );
  const vendedor = vendedores.find(
    (v) => v.id === (isReunion ? reunion?.vendedor_id : actividad?.vendedor_id)
  );

  const titulo = isReunion ? reunion?.titulo : actividad?.titulo;
  const tipo = isReunion ? reunion?.tipo : actividad?.tipo;
  const descripcion = isReunion
    ? reunion?.descripcion
    : actividad?.descripcion;
  const estado = isReunion
    ? reunion?.estado
    : actividad?.completado
    ? "completada"
    : "pendiente";
  const ubicacion = isReunion ? reunion?.ubicacion : null;

  // Fechas
  const fechaInicio = isReunion ? reunion?.fecha_inicio : actividad?.fecha;
  const fechaFin = isReunion ? reunion?.fecha_fin : actividad?.fecha_vencimiento;

  // La reunión cancelada/completada (o actividad completada) no se puede reagendar
  const puedeReagendar = (() => {
    if (reunionObjetivo) {
      return (
        reunionObjetivo.estado !== "completada" &&
        reunionObjetivo.estado !== "cancelada"
      );
    }
    if (actividadObjetivo) return !actividadObjetivo.completado;
    return false;
  })();

  const entrarEdicion = () => {
    if (reunionObjetivo) {
      setFechaInicioEdit(aDateTimeLocal(reunionObjetivo.fecha_inicio));
      setFechaFinEdit(aDateTimeLocal(reunionObjetivo.fecha_fin));
    } else if (actividadObjetivo) {
      setFechaEdit(aDateTimeLocal(actividadObjetivo.fecha));
    }
    setModoEdicion(true);
  };

  const salirEdicion = () => {
    setModoEdicion(false);
    setGuardando(false);
  };

  const guardarReagenda = async () => {
    if (!currentUser) {
      toast.error("Debes iniciar sesión para realizar esta acción.");
      return;
    }
    if (guardando) return;

    try {
      if (reunionObjetivo) {
        const inicio = new Date(fechaInicioEdit);
        const fin = new Date(fechaFinEdit);
        if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) {
          toast.error("Ingresa una fecha y hora válidas para el inicio y fin.");
          return;
        }
        if (fin.getTime() <= inicio.getTime()) {
          toast.error("La fecha de fin debe ser posterior a la de inicio.");
          return;
        }
        setGuardando(true);
        await actualizarReunion({
          ReunionData: {
            id: reunionObjetivo.id,
            fecha_inicio: inicio,
            fecha_fin: fin,
          },
          currentUser,
        });
        toast.success("Reunión reagendada correctamente");
        salirEdicion();
      } else if (actividadObjetivo) {
        const nuevaFecha = new Date(fechaEdit);
        if (Number.isNaN(nuevaFecha.getTime())) {
          toast.error("Ingresa una fecha y hora válidas.");
          return;
        }
        const payload: Partial<Actividad> = {
          id: actividadObjetivo.id,
          fecha: nuevaFecha,
        };
        // Desplaza el vencimiento el mismo delta para no dejar la actividad "vencida"
        if (actividadObjetivo.fecha_vencimiento) {
          const vieja = new Date(actividadObjetivo.fecha);
          const delta = nuevaFecha.getTime() - vieja.getTime();
          payload.fecha_vencimiento = new Date(
            new Date(actividadObjetivo.fecha_vencimiento).getTime() + delta
          );
        }
        setGuardando(true);
        await actualizarActividad(payload);
        toast.success("Actividad reagendada correctamente");
        salirEdicion();
      }
    } catch (err) {
      const message =
        (err as { message?: string })?.message ??
        "No se pudo reagendar. Intenta de nuevo.";
      toast.error(message);
    } finally {
      setGuardando(false);
    }
  };

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

            {!modoEdicion && (
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
            )}

            {modoEdicion && reunionObjetivo && (
              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-500 uppercase mb-3">
                  Reagendar reunión
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha y hora de inicio
                    </label>
                    <input
                      type="datetime-local"
                      value={fechaInicioEdit}
                      onChange={(e) => setFechaInicioEdit(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha y hora de fin
                    </label>
                    <input
                      type="datetime-local"
                      value={fechaFinEdit}
                      onChange={(e) => setFechaFinEdit(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {modoEdicion && actividadObjetivo && (
              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-500 uppercase mb-3">
                  Reagendar actividad
                </p>
                <div className="max-w-md">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nueva fecha y hora
                  </label>
                  <input
                    type="datetime-local"
                    value={fechaEdit}
                    onChange={(e) => setFechaEdit(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  />
                </div>
              </div>
            )}

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

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            {!modoEdicion ? (
              <>
                {puedeReagendar && (
                  <button
                    onClick={entrarEdicion}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Pencil className="h-4 w-4" />
                    Reagendar
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  Cerrar
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={salirEdicion}
                  disabled={guardando}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarReagenda}
                  disabled={guardando}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:bg-green-300 disabled:cursor-not-allowed"
                >
                  {guardando ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Guardar"
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
