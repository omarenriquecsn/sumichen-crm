import { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import { Lote } from "../../types";
import { toast } from "react-toastify";
import { useSupabase } from "../../hooks/useSupabase";

type Props = {
  productoId: string;
  lotes: Lote[];
  isOpen: boolean;
  onClose: () => void;
};

const MOTIVOS: { value: string; label: string }[] = [
  { value: "conteo_fisico", label: "Conteo físico" },
  { value: "merma", label: "Merma" },
  { value: "dano", label: "Daño" },
  { value: "vencimiento", label: "Vencimiento" },
  { value: "correccion", label: "Corrección" },
  { value: "otro", label: "Otro" },
];

const AjusteInventarioModal = ({
  productoId,
  lotes,
  isOpen,
  onClose,
}: Props) => {
  const { mutate: ajustar, isPending } = useSupabase().useAjusteInventario();

  const [loteId, setLoteId] = useState("");
  const [direccion, setDireccion] = useState<"entrada" | "salida">("entrada");
  const [cantidad, setCantidad] = useState(0);
  const [motivoCategoria, setMotivoCategoria] = useState("conteo_fisico");
  const [motivo, setMotivo] = useState("");

  useEffect(() => {
    if (isOpen) {
      setLoteId("");
      setDireccion("entrada");
      setCantidad(0);
      setMotivoCategoria("conteo_fisico");
      setMotivo("");
    }
  }, [isOpen]);

  const lote = lotes.find((l) => l.id === loteId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lote) {
      toast.info("Selecciona un lote.");
      return;
    }
    if (!(Number(cantidad) > 0)) {
      toast.info("Indica una cantidad mayor a 0.");
      return;
    }
    ajustar(
      {
        producto_id: productoId,
        almacen: lote.almacen,
        lote_id: lote.id,
        direccion,
        cantidad: Number(cantidad),
        motivo_categoria: motivoCategoria,
        motivo,
      },
      {
        onSuccess: () => {
          toast.success("Ajuste registrado.");
          onClose();
        },
        onError: (error: unknown) =>
          toast.error(
            error instanceof Error ? error.message : "Error al ajustar",
          ),
      },
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ajuste manual de inventario">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Lote</label>
          <select
            value={loteId}
            onChange={(e) => setLoteId(e.target.value)}
            className="mt-1 w-full border rounded px-3 py-2 bg-white"
          >
            <option value="">Selecciona un lote...</option>
            {lotes.map((l) => (
              <option key={l.id} value={l.id}>
                {l.codigo_lote} · {l.almacen.toUpperCase()} ·{" "}
                {Number(l.cantidad_actual).toFixed(2)} kg
                {l.fecha_vencimiento
                  ? ` · vence ${l.fecha_vencimiento}`
                  : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Dirección
          </label>
          <select
            value={direccion}
            onChange={(e) =>
              setDireccion(e.target.value as "entrada" | "salida")
            }
            className="mt-1 w-full border rounded px-3 py-2 bg-white"
          >
            <option value="entrada">Entrada (sumar kg)</option>
            <option value="salida">Salida (restar kg)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Cantidad (kg)
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={cantidad}
            onChange={(e) => setCantidad(Number(e.target.value))}
            className="mt-1 w-full border rounded px-3 py-2"
          />
          {lote && (
            <p className="text-xs text-gray-500 mt-1">
              Disponible en el lote:{" "}
              {Number(lote.cantidad_actual).toFixed(2)} kg
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Motivo
          </label>
          <select
            value={motivoCategoria}
            onChange={(e) => setMotivoCategoria(e.target.value)}
            className="mt-1 w-full border rounded px-3 py-2 bg-white"
          >
            {MOTIVOS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Nota (opcional)
          </label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={2}
            className="mt-1 w-full border rounded px-3 py-2"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isPending ? "Guardando..." : "Registrar ajuste"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AjusteInventarioModal;
