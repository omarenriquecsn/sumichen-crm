import React, { useRef, useState } from "react";
import { FileSpreadsheet, Upload, X } from "lucide-react";
import { toast } from "react-toastify";
import {
  useSubirProyecciones,
  RespuestaProyecciones,
} from "../../hooks/useSubirProyecciones";

type PropsCargarProyecciones = {
  isOpen: boolean;
  onClose: () => void;
  onEnviado?: (data: RespuestaProyecciones) => void;
};

const resumenTexto = (resumen: RespuestaProyecciones["resumen"]) => {
  const partes: string[] = [];
  if (resumen.actualizados > 0)
    partes.push(`${resumen.actualizados} actualizadas`);
  if (resumen.sinCambio > 0) partes.push(`${resumen.sinCambio} sin cambio`);
  if (resumen.totalFilas > 0)
    partes.push(`de ${resumen.totalFilas} filas leídas`);
  return partes.length ? `: ${partes.join(", ")}` : "";
};

export const CargarProyeccionesModal: React.FC<PropsCargarProyecciones> = ({
  isOpen,
  onClose,
  onEnviado,
}) => {
  const { mutate: subirProyecciones, isPending } = useSubirProyecciones();
  const [archivo, setArchivo] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!archivo) {
      toast.info("Selecciona un archivo Excel antes de enviar.");
      return;
    }
    subirProyecciones(archivo, {
      onSuccess: (data) => {
        const r = data?.resumen;
        if (r && (r.actualizados > 0 || r.sinCambio > 0)) {
          toast.success(`Proyecciones cargadas${resumenTexto(r)}.`);
        } else {
          toast.warning(
            "No se actualizó ninguna proyección. Revisa que los RIF coincidan con clientes existentes."
          );
        }
        if (r && r.sinCoincidencia.length > 0) {
          const muestra = r.sinCoincidencia.slice(0, 5).join(", ");
          toast.warning(
            `RIF sin coincidencia (${r.sinCoincidencia.length}): ${muestra}${r.sinCoincidencia.length > 5 ? ", ..." : ""}`
          );
        }
        if (r && r.sinPermiso.length > 0) {
          toast.info(
            `RIF sin permiso para modificar (${r.sinPermiso.length}): solo puedes cargar proyecciones de tus propios clientes.`
          );
        }
        onEnviado?.(data);
        setArchivo(null);
        onClose();
      },
      onError: (error) => {
        toast.error(
          error instanceof Error ? error.message : "Error al cargar el archivo"
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
            Cargar Proyecciones de Ventas
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 rounded-full hover:bg-gray-200 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            aria-label="Cerrar modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 text-blue-800 text-sm mb-4">
            <FileSpreadsheet className="h-5 w-5 shrink-0 mt-0.5" />
            <p>
              Sube un Excel con dos columnas:{" "}
              <strong>RIF del cliente</strong> y <strong>proyección de venta</strong>.
              Solo se actualiza la proyección de cada cliente.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label
              onClick={() => inputRef.current?.click()}
              className="block w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
            >
              {archivo ? (
                <div className="flex items-center justify-center gap-2 text-blue-700">
                  <FileSpreadsheet className="h-5 w-5" />
                  <span className="truncate font-medium">{archivo.name}</span>
                </div>
              ) : (
                <div className="text-gray-500">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="font-medium">Haz clic para seleccionar el Excel</p>
                  <p className="text-xs mt-1">.xlsx o .xls</p>
                </div>
              )}
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx, .xls"
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
                {isPending ? "Cargando..." : "Cargar Proyecciones"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
