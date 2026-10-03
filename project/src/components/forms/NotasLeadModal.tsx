import React from "react";
import { toast } from "react-toastify";
import { X, NotebookPen, Trash2, Send } from "lucide-react";
import { useSupabase } from "../../hooks/useSupabase";
import { useAuth } from "../../context/useAuth";
import { Lead } from "../../types";

interface NotasLeadModalProps {
  lead: Lead | null;
  onClose: () => void;
}

const formatoFecha = (fecha: string) => {
  try {
    return new Date(fecha).toLocaleString("es-VE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return fecha;
  }
};

const NotasLeadModal: React.FC<NotasLeadModalProps> = ({ lead, onClose }) => {
  const { useNotasLead, useCrearNotaLead, useEliminarNotaLead } = useSupabase();
  const { currentUser, userData } = useAuth();
  const { data: notas, isLoading } = useNotasLead(lead?.id || "");
  const crearNota = useCrearNotaLead();
  const eliminarNota = useEliminarNotaLead();
  const [contenido, setContenido] = React.useState("");

  if (!lead) return null;

  const esAdmin = userData?.rol === "admin";

  const handleGuardar = () => {
    const texto = contenido.trim();
    if (!texto) {
      toast.error("Escribe una nota antes de guardar");
      return;
    }
    crearNota.mutate(
      { leadId: lead.id, contenido: texto },
      {
        onSuccess: () => {
          setContenido("");
          toast.success("Nota agregada");
        },
        onError: (err) => toast.error(err.message || "Error al guardar la nota"),
      }
    );
  };

  const handleEliminar = (notaId: string) => {
    if (!window.confirm("¿Eliminar esta nota? Esta acción no se puede deshacer.")) return;
    eliminarNota.mutate(
      { leadId: lead.id, notaId },
      {
        onSuccess: () => toast.success("Nota eliminada"),
        onError: (err) => toast.error(err.message || "Error al eliminar la nota"),
      }
    );
  };

  const lista = notas || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <NotebookPen className="h-5 w-5 text-indigo-600" /> Diario de negociación
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <X className="h-6 w-6" />
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Lead: <span className="font-medium text-gray-700">{lead.datos_contacto?.nombre}</span> — anota el progreso de
          la negociación: interés, objeciones, por qué no se cerró, acuerdos, etc.
        </p>

        {/* Timeline de notas */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3 mb-4">
          {isLoading ? (
            <p className="text-sm text-gray-400">Cargando notas...</p>
          ) : lista.length === 0 ? (
            <p className="text-sm text-gray-400">Aún no hay notas para este lead.</p>
          ) : (
            lista.map((nota) => {
              const autor = nota.vendedor
                ? `${nota.vendedor.nombre} ${nota.vendedor.apellido}`
                : "Sistema";
              const inicial = (nota.vendedor?.nombre || "S").charAt(0).toUpperCase();
              const puedeBorrar = esAdmin || nota.vendedor_id === currentUser?.id;
              return (
                <div key={nota.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-semibold shrink-0">
                    {inicial}
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-gray-700">{autor}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-gray-400">{formatoFecha(nota.fecha_creacion)}</span>
                        {puedeBorrar && (
                          <button
                            onClick={() => handleEliminar(nota.id)}
                            className="text-gray-400 hover:text-red-600"
                            title="Eliminar nota"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap mt-1">{nota.contenido}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Nueva nota */}
        <div className="border-t pt-4">
          <textarea
            value={contenido}
            onChange={(e) => setContenido(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleGuardar();
            }}
            rows={3}
            placeholder="Escribe una nota de progreso... (Ctrl+Enter para guardar)"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handleGuardar}
              disabled={crearNota.isPending}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-60"
            >
              {crearNota.isPending ? (
                "Guardando..."
              ) : (
                <>
                  <Send className="h-4 w-4" /> Agregar nota
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotasLeadModal;
