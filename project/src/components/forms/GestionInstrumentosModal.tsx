import { useState } from "react";
import Modal from "../ui/Modal";
import { PedidoInstrumento } from "../../types";
import { toast } from "react-toastify";
import { useSupabase } from "../../hooks/useSupabase";

type Props = {
  pedidoId: string;
  lineas: PedidoInstrumento[];
  isOpen: boolean;
  onClose: () => void;
};

const ETIQUETA_ESTADO: Record<string, string> = {
  en_almacen: "En almacén",
  en_transito: "En tránsito",
  en_cliente: "En cliente",
  donado: "Donado",
  danado: "Dañado",
};

const GestionInstrumentosModal = ({
  pedidoId,
  lineas,
  isOpen,
  onClose,
}: Props) => {
  const supabase = useSupabase();
  const { mutate: entregar, isPending: entregando } =
    supabase.useEntregarInstrumentosPedido(pedidoId);
  const { mutate: devolver, isPending: devolviendo } =
    supabase.useAccionInstrumentoLinea("devolver", pedidoId);
  const { mutate: donar, isPending: donando } =
    supabase.useAccionInstrumentoLinea("donar", pedidoId);
  const { mutate: danar, isPending: danando } =
    supabase.useAccionInstrumentoLinea("danar", pedidoId);

  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [origenes, setOrigenes] = useState<Record<string, "cliente" | "almacen">>(
    {},
  );

  const cant = (id: string) => cantidades[id] ?? 1;
  const origen = (id: string) => origenes[id] ?? "cliente";

  const onError = (e: unknown) =>
    toast.error(e instanceof Error ? e.message : "Error al actualizar");

  const hayTransito = lineas.some((l) => Number(l.cantidad_transito) > 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Instrumentos retornables del pedido"
    >
      <div className="space-y-4">
        {hayTransito && (
          <button
            type="button"
            disabled={entregando}
            onClick={() =>
              entregar(undefined, {
                onSuccess: () =>
                  toast.success("Instrumentos marcados como entregados al cliente."),
                onError,
              })
            }
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {entregando ? "Procesando..." : "Marcar entregado al cliente"}
          </button>
        )}

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {lineas.map((l) => (
            <div key={l.id} className="border rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-800">
                  {l.tipo_instrumento?.nombre ?? "Instrumento"}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                  {ETIQUETA_ESTADO[l.estado] ?? l.estado}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 mt-1">
                <span>Entregado: {Number(l.cantidad).toFixed(0)}</span>
                <span>Tránsito: {Number(l.cantidad_transito).toFixed(0)}</span>
                <span>Cliente: {Number(l.cantidad_cliente).toFixed(0)}</span>
                <span>Almacén: {Number(l.cantidad_almacen).toFixed(0)}</span>
                {Number(l.cantidad_donada) > 0 && (
                  <span className="text-purple-600">
                    Donado: {Number(l.cantidad_donada).toFixed(0)}
                  </span>
                )}
                {Number(l.cantidad_danada) > 0 && (
                  <span className="text-red-600">
                    Dañado: {Number(l.cantidad_danada).toFixed(0)}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center mt-2">
                <input
                  type="number"
                  min={1}
                  value={cant(l.id)}
                  onChange={(e) =>
                    setCantidades((p) => ({
                      ...p,
                      [l.id]: Math.max(1, Number(e.target.value) || 1),
                    }))
                  }
                  className="sm:col-span-2 border rounded px-2 py-1"
                  aria-label="Cantidad"
                />
                <select
                  value={origen(l.id)}
                  onChange={(e) =>
                    setOrigenes((p) => ({
                      ...p,
                      [l.id]: e.target.value as "cliente" | "almacen",
                    }))
                  }
                  className="sm:col-span-3 border rounded px-2 py-1 bg-white"
                  aria-label="Origen"
                >
                  <option value="cliente">Desde cliente</option>
                  <option value="almacen">Desde almacén</option>
                </select>
                <button
                  type="button"
                  disabled={devolviendo}
                  onClick={() =>
                    devolver(
                      { lineaId: l.id, cantidad: cant(l.id) },
                      {
                        onSuccess: () => toast.success("Devolución registrada."),
                        onError,
                      },
                    )
                  }
                  className="sm:col-span-2 bg-green-600 text-white px-2 py-1 rounded text-sm hover:bg-green-700 disabled:bg-gray-400"
                >
                  Devolver
                </button>
                <button
                  type="button"
                  disabled={donando}
                  onClick={() =>
                    donar(
                      {
                        lineaId: l.id,
                        cantidad: cant(l.id),
                        origen: origen(l.id),
                      },
                      {
                        onSuccess: () => toast.success("Marcado como donado."),
                        onError,
                      },
                    )
                  }
                  className="sm:col-span-2 bg-purple-600 text-white px-2 py-1 rounded text-sm hover:bg-purple-700 disabled:bg-gray-400"
                >
                  Donar
                </button>
                <button
                  type="button"
                  disabled={danando}
                  onClick={() =>
                    danar(
                      {
                        lineaId: l.id,
                        cantidad: cant(l.id),
                        origen: origen(l.id),
                      },
                      {
                        onSuccess: () => toast.success("Marcado como dañado."),
                        onError,
                      },
                    )
                  }
                  className="sm:col-span-2 bg-red-600 text-white px-2 py-1 rounded text-sm hover:bg-red-700 disabled:bg-gray-400"
                >
                  Dañar
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default GestionInstrumentosModal;
