import React, { useRef, useState } from "react";
import { FileText, Upload, X } from "lucide-react";
import { toast } from "react-toastify";
import { useSupabase } from "../../hooks/useSupabase";
import { CotizacionParseada } from "../../types";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onParseado: (data: CotizacionParseada, archivo: File) => void;
};

/**
 * Sube una cotización PDF y la parsea (el archivo NO se guarda). Al terminar
 * devuelve los datos para precargar el formulario de pedidos.
 */
const CargarCotizacionModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onParseado,
}) => {
  const supabase = useSupabase();
  const { mutate: parsearCotizacion, isPending } = supabase.useParsearCotizacion();
  const [archivo, setArchivo] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!archivo) {
      toast.info("Selecciona la cotización PDF antes de continuar.");
      return;
    }
    parsearCotizacion(archivo, {
      onSuccess: (data) => {
        if (!data?.productos?.length) {
          toast.warning(
            "No se encontraron productos en la cotización. Verifica el PDF."
          );
          return;
        }
        onParseado(data, archivo);
        setArchivo(null);
        onClose();
      },
      onError: (error) => {
        toast.error(
          error instanceof Error
            ? error.message
            : "Error al leer la cotización"
        );
      },
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-5"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-lg w-full max-w-md relative flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">
            Crear pedido desde cotización
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 rounded-full hover:bg-gray-200 hover:text-gray-600 focus:outline-none"
            aria-label="Cerrar modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 text-blue-800 text-sm mb-4">
            <FileText className="h-5 w-5 shrink-0 mt-0.5" />
            <p>
              Sube el PDF de la cotización. Se precargará el cliente, los
              productos y sus precios para que puedas revisarlos y editarlos. El
              archivo <strong>no se guarda</strong>.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label
              onClick={() => inputRef.current?.click()}
              className="block w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
            >
              {archivo ? (
                <div className="flex items-center justify-center gap-2 text-blue-700">
                  <FileText className="h-5 w-5" />
                  <span className="truncate font-medium">{archivo.name}</span>
                </div>
              ) : (
                <div className="text-gray-500">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="font-medium">
                    Haz clic para seleccionar la cotización
                  </p>
                  <p className="text-xs mt-1">Archivo .pdf</p>
                </div>
              )}
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
              />
            </label>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors w-full sm:w-auto"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 w-full sm:w-auto"
              >
                <Upload className="h-4 w-4" />
                {isPending ? "Leyendo..." : "Continuar"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CargarCotizacionModal;
