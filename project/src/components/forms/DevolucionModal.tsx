import { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import { Pedido, ProductoPedido } from "../../types";
import { toast } from "react-toastify";
import { useSupabase } from "../../hooks/useSupabase";

type DevolucionModalProps = {
  pedido: Pedido | null;
  isOpen: boolean;
  onClose: () => void;
  onRegistrada?: () => void;
};

const ETIQUETA_ALMACEN: Record<string, string> = {
  globalca: "GLOBALCA",
  wms: "WMS",
};

const DevolucionModal = ({
  pedido,
  isOpen,
  onClose,
  onRegistrada,
}: DevolucionModalProps) => {
  const { mutate: crearDevolucion, isPending } =
    useSupabase().useCrearDevolucion();

  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [motivo, setMotivo] = useState("");
  const [notas, setNotas] = useState("");

  useEffect(() => {
    if (isOpen) {
      setCantidades({});
      setMotivo("");
      setNotas("");
    }
  }, [isOpen]);

  const lineas = pedido?.productos_pedido ?? [];

  const pendienteDe = (pp: ProductoPedido) =>
    Math.max(0, Number(pp.cantidad) - Number(pp.cantidad_devuelta ?? 0));

  const handleCantidad = (id: string, value: string, max: number) => {
    const n = Math.max(0, Math.min(Number(value) || 0, max));
    setCantidades((prev) => ({ ...prev, [id]: n }));
  };

  const totalKg = lineas.reduce(
    (acc, pp) => acc + (cantidades[pp.id] ?? 0),
    0,
  );
  const totalMonto = lineas.reduce(
    (acc, pp) =>
      acc + (cantidades[pp.id] ?? 0) * Number(pp.precio_unitario || 0),
    0,
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pedido) return;

    const productos = lineas
      .filter((pp) => (cantidades[pp.id] ?? 0) > 0)
      .map((pp) => ({
        productos_pedido_id: pp.id,
        cantidad: cantidades[pp.id],
      }));

    if (productos.length === 0) {
      toast.info("Indica al menos una cantidad a devolver.");
      return;
    }

    crearDevolucion(
      { pedidoId: pedido.id, motivo, notas, productos },
      {
        onSuccess: () => {
          toast.success("Devolución registrada exitosamente.");
          onRegistrada?.();
          onClose();
        },
        onError: (error: unknown) => {
          toast.error(
            error instanceof Error
              ? error.message
              : "Error al registrar la devolución",
          );
        },
      },
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Devolución del pedido N° ${pedido?.numero ?? ""}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-600">
          Indica los kg devueltos por producto. El stock se repone al inventario
          y el monto se descuenta de las ventas.
        </p>

        <div className="space-y-3 max-h-72 overflow-y-auto">
          {lineas.map((pp) => {
            const pendiente = pendienteDe(pp);
            return (
              <div key={pp.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-800">
                    {pp.producto?.nombre ?? pp.nombre}
                  </span>
                  <span className="text-xs text-gray-500">
                    {pp.almacen ? ETIQUETA_ALMACEN[pp.almacen] ?? pp.almacen : "-"}
                  </span>
                </div>
                <div className="flex flex-wrap justify-between gap-2 text-xs text-gray-600 mt-1">
                  <span>Pedido: {Number(pp.cantidad).toFixed(2)} kg</span>
                  <span>
                    Devuelto: {Number(pp.cantidad_devuelta ?? 0).toFixed(2)} kg
                  </span>
                  <span>Pendiente: {pendiente.toFixed(2)} kg</span>
                </div>
                <input
                  type="number"
                  min={0}
                  max={pendiente}
                  step="0.01"
                  value={cantidades[pp.id] ?? 0}
                  disabled={pendiente <= 0}
                  onChange={(e) =>
                    handleCantidad(pp.id, e.target.value, pendiente)
                  }
                  className="mt-2 w-full border rounded px-2 py-1 disabled:bg-gray-100"
                  aria-label={`Kg a devolver de ${pp.producto?.nombre ?? pp.nombre}`}
                />
              </div>
            );
          })}
        </div>

        <div>
          <label htmlFor="motivo" className="block text-sm font-medium text-gray-700">
            Motivo
          </label>
          <select
            id="motivo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="mt-1 block w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm bg-white"
          >
            <option value="">Selecciona un motivo</option>
            <option value="producto_defectuoso">Producto defectuoso</option>
            <option value="no_conforme">No conforme</option>
            <option value="error_pedido">Error en el pedido</option>
            <option value="otro">Otro</option>
          </select>
        </div>

        <div>
          <label htmlFor="notas" className="block text-sm font-medium text-gray-700">
            Notas (opcional)
          </label>
          <textarea
            id="notas"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={2}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
          />
        </div>

        <div className="text-sm text-gray-700 bg-gray-50 rounded p-2">
          Total a devolver: <strong>{totalKg.toFixed(2)} kg</strong> ·{" "}
          <strong>${totalMonto.toFixed(2)}</strong>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isPending || totalKg <= 0}
            className="bg-blue-600 hover:bg-blue-700 transition-colors text-white px-6 py-2 rounded-lg font-semibold shadow-sm disabled:bg-gray-400"
          >
            {isPending ? "Registrando..." : "Registrar devolución"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default DevolucionModal;
