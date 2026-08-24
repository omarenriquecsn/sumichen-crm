import React from "react";
import { UseMutateFunction } from "@tanstack/react-query";
import { Actividad } from "../../types";
import { useSupabase } from "../../hooks/useSupabase";
import Modal from "../ui/Modal";
import { toast } from "react-toastify";

interface ActualizarActividadModalProps {
  isOpen: boolean;
  onClose: () => void;
  actividad: Actividad | null;
  onUpdated?: (actividad: Actividad) => void;
}

type MutateFn = UseMutateFunction<Actividad, unknown, Actividad, unknown>;

const ActualizarActividadModal: React.FC<ActualizarActividadModalProps> = ({
  isOpen,
  onClose,
  actividad,
  onUpdated,
}) => {
  // tipar la salida del hook sin usar `any`
  const raw = useSupabase().useActualizarActividad() as unknown;
  const { mutate: actualizarActividad, isLoading } = raw as {
    mutate: MutateFn;
    isLoading: boolean;
  };

  const [actividadState, setActividadState] = React.useState<string>(() =>
    actividad?.descripcion ?? ""
  );

  React.useEffect(() => {
    setActividadState(actividad?.descripcion ?? "");
  }, [actividad]);

  const handleActualizar = () => {
    if (!actividad || actividadState === null) return;

    const payload: Actividad = {
      ...actividad,
      descripcion: actividadState,
    };

    actualizarActividad(payload, {
      onSuccess: (updated: Actividad) => {
        toast.success("Actividad actualizada correctamente");
        onUpdated?.(updated);
        onClose();
      },
      onError: (err: unknown) => {
        console.error("Error actualizando actividad:", err);
        const message =
          (err as { message?: string })?.message ??
          "No se pudo actualizar la actividad. Intenta de nuevo.";
        toast.error(message);
      },
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Actualizar Actividad</h2>

        <textarea
          placeholder="Aquí podrás actualizar la descripción de la actividad"
          value={actividadState}
          onChange={(e) => setActividadState(e.target.value)}
          className="w-full min-h-[120px] p-3 border rounded"
        />

        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded"
            disabled={isLoading}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleActualizar}
            className="px-4 py-2 bg-blue-600 text-white rounded"
            disabled={!actividadState || isLoading}
          >
            {isLoading ? "Actualizando..." : "Actualizar"}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ActualizarActividadModal;