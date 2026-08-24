import { useState } from "react";
import { Pedido } from "../../types";
import { useNavigate } from "react-router-dom";

type FechaEntregaSelectorProps = {
  pedidoOriginal: Pedido | null;
  onSubmit: (fecha: string) => void;
  onCancel?: () => void;
};

export const FechaEntregaSelector = ({
  pedidoOriginal,
  onSubmit,
  onCancel,
}: FechaEntregaSelectorProps) => {
  const [fechaEntrega, setFechaEntrega] = useState("hola");
  const navigate = useNavigate();

  if (!pedidoOriginal) {
    navigate("/pedidos");
    return;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">
        Duplicar pedido {pedidoOriginal?.numero}
      </h3>

      <label
        htmlFor="fecha_entrega"
        className="block text-sm font-medium text-gray-700"
      >
        Fecha de Entrega
      </label>
      <input
        type="date"
        value={fechaEntrega}
        onChange={(e) => setFechaEntrega(e.target.value)}
        className="border p-2 rounded w-full"
      />

      <div className="flex gap-2">
        <button
          onClick={() => {
            onSubmit(fechaEntrega)}}
          disabled={!fechaEntrega}
          
          className="bg-green-600 text-white px-4 py-2 rounded-lg"
        >
          Duplicar
        </button>

        {onCancel && (
          <button
            onClick={onCancel}
            className="bg-gray-300 px-4 py-2 rounded-lg"
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
};
