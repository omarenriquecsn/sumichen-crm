// DetalleInteraccionModal.tsx
import { useState } from "react";
import { Cliente, Oportunidad } from "../../types";
import { useSupabase } from "../../hooks/useSupabase";
import { User } from "@supabase/supabase-js";

interface DetalleInteraccionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (detalle: string) => void;
  cliente: Cliente;
  oportunidad: Oportunidad;
}
export const DetalleInteraccionModal = ({
  isOpen,
  onClose,
  cliente,
  oportunidad,
}: DetalleInteraccionModalProps) => {
  const supabase = useSupabase();

  const { mutate: cambiarNota } = supabase.useActualizarCliente();
  const { mutate: actualizarOportunidad } = supabase.useActualizarOportunidad();
  const [detalle, setDetalle] = useState("");
  const [valorOportunidad, setValorOportunidad] = useState(0);

  const handledSumit = () => {
    const elValorNuevo =
      valorOportunidad > 0 ? valorOportunidad : oportunidad.valor;
    const elDetalleNuevo = detalle.trim().length === 0 ? cliente.notas : detalle;
    cliente.notas = elDetalleNuevo;
    actualizarOportunidad({
      OportunidadData: { valor: elValorNuevo, id: oportunidad.id },
      currentUser: { id: cliente.vendedor_id } as User,
    });
    cambiarNota({
      clienteData: { notas: elDetalleNuevo, id: cliente.id },
      currentUser: { id: cliente.vendedor_id } as User,
    });
    setValorOportunidad(0);
    setDetalle("");
    onClose();
  };

  return isOpen ? (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-md">
        <h2 className="text-lg font-bold mb-2">Detalles de la interacción</h2>
        <p className="mb-2 text-sm text-gray-600">
          Cliente: <b>{cliente.empresa}</b>
        </p>
        <textarea
          className="w-full border rounded p-2 mb-4"
          rows={4}
          placeholder="Ejemplo: Llamada realizada, se presentó propuesta, el cliente pidió tiempo para analizar..."
          value={detalle}
          onChange={(e) => setDetalle(e.target.value)}
        />
        <input
          type="number"
          className="w-full border rounded p-2 mb-4"
          placeholder="Si tienes una estimación, ingrésala aquí"
          value={valorOportunidad > 0 ? valorOportunidad : ""}
          onChange={(e) => setValorOportunidad(Number(e.target.value))}
        />
        <div className="flex justify-end gap-2">
          <button className="px-4 py-2 bg-gray-200 rounded" onClick={() => {
            setDetalle("")
            setValorOportunidad(0)
            onClose()
          }}>
            Cancelar
          </button>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded"
            onClick={handledSumit}
            // disabled={!detalle.trim()}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  ) : null;
};

export default DetalleInteraccionModal;
