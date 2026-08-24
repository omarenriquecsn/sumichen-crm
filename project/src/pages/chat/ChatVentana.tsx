import React from "react";
import { Layout } from "../../components/layout/Layout";
import { useAuth } from "../../context/useAuth";
import { useSupabase } from "../../hooks/useSupabase";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Send, ArrowLeft, AlertCircle, Check } from "lucide-react";

const ChatVentana: React.FC = () => {
  const { currentUser } = useAuth();
  const { useConversacionById, useMensajes, useEnviarMensaje } = useSupabase();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [message, setMessage] = React.useState("");
  const [scrollToBottom, setScrollToBottom] = React.useState(0);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const { data: conversacion, isLoading: loadingConv } = useConversacionById(id || "");
  const { data: mensajes, isLoading: loadingMsg, refetch: refetchMsg } = useMensajes(id || "", 1, 50);
  const enviarMensaje = useEnviarMensaje();

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, scrollToBottom]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !conversacion) return;
    enviarMensaje.mutate(
      { conversacionId: conversacion.id, contenido: message, tipo: "texto" },
      {
        onSuccess: () => {
          setMessage("");
          setScrollToBottom((prev) => prev + 1);
          refetchMsg();
        },
        onError: (err) => toast.error(err.message || "Error al enviar"),
      }
    );
  };

  if (loadingConv || loadingMsg) {
    return <Layout title="Chat" subtitle=""><div className="flex items-center justify-center h-[60vh]">Cargando...</div></Layout>;
  }

  if (!conversacion) {
    return <Layout title="Chat" subtitle=""><div className="text-center py-12">Conversación no encontrada</div></Layout>;
  }

  const lead = conversacion.lead;
  const vendedor = conversacion.vendedor;

  return (
    <Layout title="Chat" subtitle={lead?.datos_contacto?.nombre}>
      <div className="flex h-[calc(100vh-200px)]">
        {/* Sidebar info lead */}
        <aside className="w-80 border-r bg-gray-50 p-4 overflow-y-auto">
          <button
            onClick={() => navigate("/chat")}
            className="mb-4 text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" /> Volver
          </button>

          <div className="mb-4 p-4 bg-white rounded-lg shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                {lead?.datos_contacto?.nombre?.charAt(0).toUpperCase() || "?"}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{lead?.datos_contacto?.nombre}</h3>
                <p className="text-sm text-gray-500">{lead?.datos_contacto?.telefono}</p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Email</span>
                <span className="font-medium">{lead?.datos_contacto?.email || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Origen</span>
                <span className="font-medium capitalize">{lead?.origen}</span>
              </div>
              {lead?.tipo_web && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Tipo</span>
                  <span className="font-medium capitalize">{lead?.tipo_web}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Zona</span>
                <span className="font-medium">{lead?.zona?.nombre || "Sin zona"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Estado</span>
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                  {lead?.estado}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Vendedor</span>
                <span className="font-medium">{vendedor?.nombre} {vendedor?.apellido}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h4 className="font-semibold text-gray-900 mb-2">Mensaje inicial</h4>
            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{lead?.datos_contacto?.mensaje_inicial}</p>
          </div>
        </aside>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {mensajes?.map((msg) => {
              const esMio = msg.remitente_tipo === "vendedor" && msg.remitente_id === currentUser?.id;
              const esDelLead = msg.remitente_tipo === "lead";
              const esSistema = msg.remitente_tipo === "sistema";

              if (esSistema) {
                return (
                  <div key={msg.id} className="text-center text-xs text-gray-500 py-2">
                    {msg.contenido}
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex ${esMio ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                      esMio
                        ? "bg-blue-600 text-white rounded-tr-none"
                        : "bg-gray-100 text-gray-900 rounded-tl-none"
                    }`}
                  >
                    {!esMio && (
                      <div className="text-xs text-gray-500 mb-1 ml-1">
                        {esDelLead ? lead?.datos_contacto?.nombre : vendedor?.nombre}
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">{msg.contenido}</div>
                    <div className={`flex items-center gap-1 mt-1 text-xs ${esMio ? "justify-end text-blue-100" : "text-gray-400"}`}>
                      <span>
                        {new Date(msg.fecha_creacion).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {esMio && (
                        <Check className="h-3 w-3" />
                      )}
                      {msg.detectado_sin_stock && (
                        <span title="Posible producto sin stock">
                          <AlertCircle className="h-3 w-3 text-amber-500" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t p-4 bg-white">
            <form onSubmit={handleSend} className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Escribe un mensaje..."
                className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!conversacion || conversacion.estado === "cerrada"}
              />
              <button
                type="submit"
                disabled={!message.trim() || !conversacion || conversacion.estado === "cerrada" || enviarMensaje.isPending}
                className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-5 w-5" />
              </button>
            </form>
            {conversacion.estado === "cerrada" && (
              <p className="text-center text-sm text-gray-500 mt-2">Conversación cerrada</p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ChatVentana;