import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  File as FileIcon,
  Loader2,
} from "lucide-react";
import { PedidoEvidencia } from "../../types";
import { useAuth } from "../../context/useAuth";
import { formatearTamanoArchivo } from "../../utils/pedidos";

type TipoVista = "pdf" | "imagen" | "excel" | "otro";

const EXT_IMAGEN = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"];
const EXT_EXCEL = ["xlsx", "xls", "csv"];

const extensionDe = (nombre: string) =>
  (nombre.split(".").pop() || "").toLowerCase();

const detectarTipo = (ev: PedidoEvidencia): TipoVista => {
  const mime = (ev.mime || "").toLowerCase();
  const ext = extensionDe(ev.nombre_original);
  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (mime.startsWith("image/") || EXT_IMAGEN.includes(ext)) return "imagen";
  if (
    mime.includes("spreadsheet") ||
    mime.includes("excel") ||
    EXT_EXCEL.includes(ext)
  )
    return "excel";
  return "otro";
};

type Props = {
  evidencias: PedidoEvidencia[];
  indiceInicial: number;
  onClose: () => void;
};

/**
 * Visor integrado de evidencias. Descarga cada archivo con el header
 * Authorization (token fuera de la URL) y crea un objectURL temporal:
 * - PDF  → iframe embebido
 * - imagen → <img> con zoom
 * - Excel → tabla (SheetJS)
 * - otros (Word, zip...) → descarga
 */
const EvidenciaViewerModal = ({ evidencias, indiceInicial, onClose }: Props) => {
  const { session } = useAuth();
  const [indice, setIndice] = useState(
    Math.min(Math.max(indiceInicial, 0), Math.max(evidencias.length - 1, 0))
  );
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [excelFilas, setExcelFilas] = useState<unknown[][] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const actual = evidencias[indice];
  const tipo = useMemo(
    () => (actual ? detectarTipo(actual) : "otro"),
    [actual]
  );

  // Cerrar con Escape y navegar con flechas
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setIndice((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight")
        setIndice((i) => Math.min(evidencias.length - 1, i + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, evidencias.length]);

  useEffect(() => {
    if (!actual) return;
    let cancelado = false;
    let urlCreada: string | null = null;

    const cargar = async () => {
      setCargando(true);
      setError(null);
      setExcelFilas(null);
      setObjectUrl(null);

      try {
        // Se descarga con el header Authorization (el token NO va en la URL).
        const res = await fetch(actual.url, {
          headers: {
            Authorization: `Bearer ${session?.access_token ?? ""}`,
          },
          credentials: "include",
        });
        if (!res.ok) throw new Error("No se pudo abrir la evidencia");
        const blob = await res.blob();
        urlCreada = URL.createObjectURL(blob);
        if (cancelado) {
          URL.revokeObjectURL(urlCreada);
          return;
        }
        setObjectUrl(urlCreada);

        if (detectarTipo(actual) === "excel") {
          const buf = await blob.arrayBuffer();
          const wb = XLSX.read(buf, { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const filas = XLSX.utils.sheet_to_json(ws, {
            header: 1,
            blankrows: false,
          }) as unknown[][];
          if (!cancelado) setExcelFilas(filas);
        }
      } catch (e) {
        if (!cancelado) {
          setError(
            e instanceof Error ? e.message : "No se pudo abrir la evidencia"
          );
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    };

    cargar();

    return () => {
      cancelado = true;
      if (urlCreada) URL.revokeObjectURL(urlCreada);
    };
  }, [actual, session?.access_token]);

  const descargar = () => {
    if (!objectUrl || !actual) return;
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = actual.nombre_original;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  if (!actual) return null;

  const IconoTipo =
    tipo === "excel"
      ? FileSpreadsheet
      : tipo === "imagen"
        ? ImageIcon
        : tipo === "pdf"
          ? FileText
          : FileIcon;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-2 sm:p-6"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
          <IconoTipo className="h-5 w-5 text-blue-600 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-gray-800 truncate">
              {actual.nombre_original}
            </p>
            <p className="text-xs text-gray-500">
              {indice + 1} de {evidencias.length}
              {formatearTamanoArchivo(actual.tamano)
                ? ` · ${formatearTamanoArchivo(actual.tamano)}`
                : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={descargar}
            disabled={!objectUrl}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50"
            title="Descargar"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Descargar</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            title="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 bg-gray-100 overflow-auto flex items-center justify-center">
          {cargando && (
            <div className="flex flex-col items-center gap-2 text-gray-500">
              <Loader2 className="h-7 w-7 animate-spin" />
              <span className="text-sm">Cargando archivo...</span>
            </div>
          )}

          {!cargando && error && (
            <div className="text-center text-red-600 px-6">
              <p className="font-medium">No se pudo mostrar el archivo</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          {!cargando && !error && objectUrl && tipo === "pdf" && (
            <iframe
              src={objectUrl}
              title={actual.nombre_original}
              className="w-full h-full"
            />
          )}

          {!cargando && !error && objectUrl && tipo === "imagen" && (
            <img
              src={objectUrl}
              alt={actual.nombre_original}
              className="max-h-full max-w-full object-contain p-2"
            />
          )}

          {!cargando && !error && tipo === "excel" && (
            <div className="w-full h-full overflow-auto p-3 bg-white">
              {excelFilas && excelFilas.length > 0 ? (
                <table className="min-w-full text-xs border-collapse">
                  <tbody>
                    {excelFilas.map((fila, r) => (
                      <tr key={r} className={r === 0 ? "bg-gray-100 font-semibold" : ""}>
                        {(Array.isArray(fila) ? fila : []).map((celda, c) => (
                          <td
                            key={c}
                            className="border border-gray-200 px-2 py-1 whitespace-nowrap"
                          >
                            {celda === null || celda === undefined
                              ? ""
                              : String(celda)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-gray-500">
                  La hoja está vacía o no se pudo leer.
                </p>
              )}
            </div>
          )}

          {!cargando && !error && tipo === "otro" && (
            <div className="text-center text-gray-600 px-6">
              <FileIcon className="h-12 w-12 mx-auto text-gray-400" />
              <p className="font-medium mt-3">
                Este tipo de archivo no se puede previsualizar
              </p>
              <p className="text-sm mt-1">
                Descárgalo para abrirlo con el programa correspondiente.
              </p>
              <button
                type="button"
                onClick={descargar}
                disabled={!objectUrl}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Descargar
              </button>
            </div>
          )}
        </div>

        {/* Footer: navegación */}
        {evidencias.length > 1 && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 bg-white">
            <button
              type="button"
              onClick={() => setIndice((i) => Math.max(0, i - 1))}
              disabled={indice === 0}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </button>
            <span className="text-xs text-gray-500">
              {indice + 1} / {evidencias.length}
            </span>
            <button
              type="button"
              onClick={() =>
                setIndice((i) => Math.min(evidencias.length - 1, i + 1))
              }
              disabled={indice === evidencias.length - 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-40"
            >
              Siguiente <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EvidenciaViewerModal;
