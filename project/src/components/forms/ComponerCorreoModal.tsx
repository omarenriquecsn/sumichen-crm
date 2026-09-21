import React, { useEffect, useRef, useState } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { Paperclip, Send, X, Loader2, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { Cliente } from "../../types";
import { useEnviarCorreo } from "../../hooks/useEnviarCorreo";
import { useGoogleStatus } from "../../hooks/useGoogleAuth";
import { useAuth } from "../../context/useAuth";
import { formatearRemitenteFallback } from "../../utils/remitente";

interface ComponerCorreoModalProps {
  cliente: Cliente;
  firmaUrl?: string;
  open: boolean;
  onClose: () => void;
  onEnviado: () => void;
}

const toolbar = [
  [{ header: [2, 3, false] }],
  ["bold", "italic", "underline", "strike"],
  [{ list: "ordered" }, { list: "bullet" }],
  ["link"],
  ["clean"],
];

const MAX_ADJUNTOS = 10;
const MAX_TOTAL_ADJUNTOS = 20 * 1024 * 1024; // 20 MB (suma total)

const formatearTamaño = (bytes: number): string => {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
};

export const ComponerCorreoModal: React.FC<ComponerCorreoModalProps> = ({
  cliente,
  firmaUrl,
  open,
  onClose,
  onEnviado,
}) => {
  const enviarCorreo = useEnviarCorreo();
  const google = useGoogleStatus();
  const { userData } = useAuth();
  const [asunto, setAsunto] = useState("");
  const [cuerpo, setCuerpo] = useState("");
  const [adjuntos, setAdjuntos] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Remitente real con el que saldrá el correo: la cuenta de Gmail conectada o,
  // si no hay, el correo del CRM (`nombre.apellido@dominio`).
  const remitente =
    google.data?.conectado && google.data.email
      ? `tu Gmail (${google.data.email})`
      : formatearRemitenteFallback(userData?.nombre, userData?.apellido);

  // Al abrir, precarga el saludo en el cuerpo (solo la primera vez por cliente).
  useEffect(() => {
    if (open) {
      setCuerpo(
        `<p>Estimado(a) ${cliente.nombre} ${cliente.apellido},</p><p><br></p><p>Nos alegra contactarte.</p>`,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const seleccionarAdjuntos = (files: FileList | null) => {
    if (!files) return;
    const nuevos = Array.from(files);
    const total = adjuntos.length + nuevos.length;
    if (total > MAX_ADJUNTOS) {
      toast.error(`Máximo ${MAX_ADJUNTOS} archivos adjuntos por correo.`);
      return;
    }
    const sumaBytes =
      adjuntos.reduce((acc, f) => acc + f.size, 0) +
      nuevos.reduce((acc, f) => acc + f.size, 0);
    if (sumaBytes > MAX_TOTAL_ADJUNTOS) {
      toast.error("La suma de los adjuntos no puede superar 20 MB.");
      return;
    }
    setAdjuntos((prev) => [...prev, ...nuevos]);
  };

  const quitarAdjunto = (indice: number) => {
    setAdjuntos((prev) => prev.filter((_, i) => i !== indice));
  };

  const handleEnviar = async () => {
    if (!cliente.email) {
      toast.error("El cliente no tiene email registrado.");
      return;
    }
    try {
      await enviarCorreo.mutateAsync({
        to: cliente.email,
        asunto: asunto.trim() || "Contacto desde Sumichem",
        cuerpo,
        adjuntos,
      });
      toast.success("Correo enviado correctamente.");
      setAsunto("");
      setCuerpo("");
      setAdjuntos([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onEnviado();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al enviar el correo.");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black bg-opacity-50 p-0 sm:p-5">
      <div className="bg-white rounded-t-xl sm:rounded-xl shadow-2xl w-full sm:max-w-3xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Encabezado */}
        <div className="flex-shrink-0 px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Nuevo mensaje</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 rounded-full hover:bg-gray-200 hover:text-gray-700"
            aria-label="Descartar correo"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Aviso: Gmail no conectado */}
        {google.data && google.data.conectado === false && (
          <div className="flex-shrink-0 mx-5 mt-4 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-500" />
            <p>
              No conectaste tu Gmail. Este correo se enviará desde el correo del
              CRM y no quedará en tus Enviados. Puedes adjuntar hasta 20 MB en
              total.{" "}
              <Link
                to="/configuracion"
                onClick={onClose}
                className="font-semibold text-amber-900 underline"
              >
                Conectar Gmail
              </Link>
            </p>
          </div>
        )}

        {/* Para */}
        <div className="px-5 pt-4">
          <div className="flex items-center border-b border-gray-200 pb-2 gap-2">
            <span className="text-sm font-medium text-gray-500 w-12">Para</span>
            <div className="flex-1 px-3 py-1.5 rounded-full bg-blue-50 text-blue-800 text-sm">
              {cliente.email}
            </div>
            <span className="text-xs text-gray-400">C</span>
            <span className="text-xs text-gray-400">CCO</span>
          </div>
          <div className="flex items-center border-b border-gray-200 py-2 gap-2">
            <span className="text-sm font-medium text-gray-500 w-12">Asunto</span>
            <input
              type="text"
              value={asunto}
              onChange={(e) => setAsunto(e.target.value)}
              placeholder="Asunto"
              className="flex-1 px-3 py-1.5 text-sm focus:outline-none"
            />
          </div>
        </div>

        {/* Cuerpo */}
        <div className="flex-1 px-5 py-3 overflow-y-auto min-h-[220px]">
          <ReactQuill
            theme="snow"
            value={cuerpo}
            onChange={setCuerpo}
            modules={{ toolbar }}
            placeholder="Escribe tu mensaje..."
            className="h-56"
          />
          <div className="h-16"></div>
        </div>

        {/* Adjuntos */}
        {adjuntos.length > 0 && (
          <div className="px-5 py-2 flex flex-wrap gap-2">
            {adjuntos.map((archivo, i) => (
              <div
                key={`${archivo.name}-${i}`}
                className="flex items-center gap-2 bg-gray-100 border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
              >
                <span className="max-w-[180px] truncate text-gray-700">
                  {archivo.name}
                </span>
                <span className="text-xs text-gray-400">
                  {formatearTamaño(archivo.size)}
                </span>
                <button
                  onClick={() => quitarAdjunto(i)}
                  className="text-gray-400 hover:text-red-600"
                  aria-label={`Quitar ${archivo.name}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Barra inferior */}
        <div className="flex-shrink-0 px-5 py-3 border-t border-gray-200 flex flex-wrap items-center gap-3">
          <button
            onClick={handleEnviar}
            disabled={enviarCorreo.isPending}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded-full transition-colors"
          >
            {enviarCorreo.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {enviarCorreo.isPending ? "Enviando..." : "Enviar"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(e) => seleccionarAdjuntos(e.target.files)}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium px-3 py-2 rounded-full hover:bg-gray-100 transition-colors"
            title="Adjuntar archivos"
          >
            <Paperclip className="h-5 w-5" />
            Adjuntar
          </button>
          <span className="text-xs text-gray-400">Máx. 20 MB en total</span>
          <div className="ml-auto text-right">
            <span className="text-xs text-gray-500">
              Se enviará desde:{" "}
              <span className="font-medium text-gray-700">{remitente}</span>
            </span>
            {firmaUrl && (
              <span className="block text-xs text-gray-400">
                Se incluirá tu firma en el pie del correo
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComponerCorreoModal;
