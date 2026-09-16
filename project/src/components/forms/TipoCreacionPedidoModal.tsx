import React from "react";
import { Pencil, FileUp, X } from "lucide-react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onManual: () => void;
  onAutomatico: () => void;
};

/**
 * Pregunta cómo crear el pedido: manual (flujo actual) o automático (precargar
 * desde una cotización PDF).
 */
const TipoCreacionPedidoModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onManual,
  onAutomatico,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-5"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-lg w-full max-w-lg relative flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">Nuevo Pedido</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 rounded-full hover:bg-gray-200 hover:text-gray-600 focus:outline-none"
            aria-label="Cerrar modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-3">
          <p className="text-sm text-gray-600">
            ¿Cómo quieres crear el pedido?
          </p>

          <button
            type="button"
            onClick={onManual}
            className="w-full flex items-start gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 transition-colors text-left"
          >
            <span className="p-2 rounded-lg bg-blue-100 text-blue-600 shrink-0">
              <Pencil className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-semibold text-gray-800">
                Manual
              </span>
              <span className="block text-sm text-gray-500">
                Elegir cliente y productos desde cero.
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={onAutomatico}
            className="w-full flex items-start gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 transition-colors text-left"
          >
            <span className="p-2 rounded-lg bg-emerald-100 text-emerald-600 shrink-0">
              <FileUp className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-semibold text-gray-800">
                Automático (desde cotización PDF)
              </span>
              <span className="block text-sm text-gray-500">
                Precargar cliente, productos y precios desde una cotización. El
                PDF no se guarda.
              </span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TipoCreacionPedidoModal;
