import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Phone } from "lucide-react";

/**
 * Recibe una llamada disparada desde otro dispositivo (push "Llamar a ..."):
 * la notificación abre la app en `#/clientes/:id?accion=llamar&telefono=...`.
 * Muestra un modal con botón "Llamar ahora" (gesto del usuario, requerido por
 * iOS para lanzar `tel:`) y limpia el query de la URL.
 */
export const LlamarDesdePush: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [llamada, setLlamada] = useState<{ telefono: string } | null>(null);

  useEffect(() => {
    if (searchParams.get("accion") === "llamar") {
      const telefono = searchParams.get("telefono");
      if (telefono) setLlamada({ telefono });
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  if (!llamada) return null;

  const cerrar = () => setLlamada(null);

  const llamarAhora = () => {
    window.location.href = `tel:${llamada.telefono}`;
    cerrar();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-5">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <Phone className="h-6 w-6" />
          </span>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Llamar al cliente
            </h3>
            <p className="text-sm text-gray-500">{llamada.telefono}</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-5">
          Pulsa el botón para abrir la marcación en este teléfono.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={cerrar}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={llamarAhora}
            className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Phone className="h-4 w-4" />
            Llamar ahora
          </button>
        </div>
      </div>
    </div>
  );
};
