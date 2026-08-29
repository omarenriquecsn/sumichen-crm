import React from "react";
import { Download, Share, Plus, Home, X } from "lucide-react";

interface InstalarAppModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Modal con instrucciones para instalar la app en iOS (Safari no dispara
 * beforeinstallprompt; la instalación es manual desde "Añadir a pantalla de inicio").
 */
export const InstalarAppModal: React.FC<InstalarAppModalProps> = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Instalar la app en tu iPhone/iPad
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Para tener el CRM como app y recibir notificaciones, agrega la
              página a tu pantalla de inicio:
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <ol className="space-y-3 text-sm text-gray-700">
          <li className="flex items-start gap-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-semibold flex-shrink-0">
              1
            </span>
            <span className="flex items-center gap-2 pt-1">
              Pulsa el botón <Share className="h-4 w-4 text-gray-500" />{" "}
              Compartir en Safari
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-semibold flex-shrink-0">
              2
            </span>
            <span className="flex items-center gap-2 pt-1">
              Toca{" "}
              <span className="inline-flex items-center gap-1 text-blue-700 font-medium">
                <Plus className="h-4 w-4" /> Añadir a pantalla de inicio
              </span>
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-semibold flex-shrink-0">
              3
            </span>
            <span className="flex items-center gap-2 pt-1">
              Pulsa{" "}
              <span className="inline-flex items-center gap-1 text-blue-700 font-medium">
                <Download className="h-4 w-4" /> Agregar
              </span>
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-semibold flex-shrink-0">
              4
            </span>
            <span className="flex items-center gap-2 pt-1">
              Abre el CRM desde el ícono <Home className="h-4 w-4 text-gray-500" />{" "}
              en tu pantalla de inicio
            </span>
          </li>
        </ol>

        <p className="text-xs text-gray-500 mt-4">
          Nota: las notificaciones push en iOS requieren iOS 16.4 o superior.
        </p>

        <button
          onClick={onClose}
          className="mt-5 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors"
        >
          Entendido
        </button>
      </div>
    </div>
  );
};
