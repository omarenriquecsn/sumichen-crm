import React, { useEffect, useRef, useState } from "react";
import {
  Calendar,
  Copy,
  FileText,
  Mail,
  MessageCircle,
  Phone,
  Smartphone,
  Trash,
  UserCheck,
} from "lucide-react";
import { toast } from "react-toastify";
import { Cliente } from "../../types";
import { enviarLlamadaMovilFront } from "../../lib/push";

interface AccionesRapidasClienteProps {
  cliente: Cliente;
  isMobile: boolean;
  esAdmin: boolean;
  onLlamar: () => void;
  onEmailMovil: () => void;
  onEmailDesktop: () => void;
  onAgendarReunion: () => void;
  onCrearPedido: () => void;
  onAsignarVendedor?: () => void;
  onEliminarDefinitivamente?: () => void;
}

const normalizarTelefonoWhatsApp = (telefono: string): string => {
  let digitos = telefono.replace(/\D/g, "");
  if (digitos.startsWith("0")) {
    digitos = `58${digitos.slice(1)}`;
  } else if (!digitos.startsWith("58")) {
    digitos = `58${digitos}`;
  }
  return digitos;
};

const claseBaseTarjeta =
  "flex flex-col items-center gap-2 p-3 rounded-xl border border-gray-200 transition-colors w-full text-center";

export const AccionesRapidasCliente: React.FC<AccionesRapidasClienteProps> = ({
  cliente,
  isMobile,
  esAdmin,
  onLlamar,
  onEmailMovil,
  onEmailDesktop,
  onAgendarReunion,
  onCrearPedido,
  onAsignarVendedor,
  onEliminarDefinitivamente,
}) => {
  const [menuLlamarAbierto, setMenuLlamarAbierto] = useState(false);
  const [enviandoAlMovil, setEnviandoAlMovil] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuLlamarAbierto) return;
    const cerrarPorClicFuera = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuLlamarAbierto(false);
      }
    };
    const cerrarPorEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuLlamarAbierto(false);
    };
    document.addEventListener("mousedown", cerrarPorClicFuera);
    document.addEventListener("keydown", cerrarPorEscape);
    return () => {
      document.removeEventListener("mousedown", cerrarPorClicFuera);
      document.removeEventListener("keydown", cerrarPorEscape);
    };
  }, [menuLlamarAbierto]);

  const tieneTelefono = Boolean(cliente.telefono);
  const numeroWhatsApp = tieneTelefono
    ? normalizarTelefonoWhatsApp(cliente.telefono)
    : "";

  const copiarNumero = async () => {
    try {
      await navigator.clipboard.writeText(cliente.telefono);
      toast.success("Número de teléfono copiado");
    } catch {
      toast.error("No se pudo copiar el número");
    }
    setMenuLlamarAbierto(false);
  };

  const enviarAlMovil = async () => {
    setMenuLlamarAbierto(false);
    setEnviandoAlMovil(true);
    try {
      const res = await enviarLlamadaMovilFront({
        telefono: cliente.telefono,
        clienteId: cliente.id,
        nombre: `${cliente.nombre} ${cliente.apellido}`.trim(),
      });
      if (res.enviadas === 0) {
        toast.error(
          "No encontramos tu móvil con la app. Instala la app en el teléfono y activa las notificaciones en Configuración → Notificaciones.",
        );
      } else {
        toast.success(
          `Notificación enviada a tu móvil (${res.enviadas} dispositivo${
            res.enviadas > 1 ? "s" : ""
          }). Toca la notificación y pulsa "Llamar ahora".`,
        );
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Error enviando la notificación al móvil",
      );
    } finally {
      setEnviandoAlMovil(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Acciones Rápidas
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {tieneTelefono &&
          (isMobile ? (
            <a
              href={`tel:${cliente.telefono}`}
              onClick={onLlamar}
              className={`${claseBaseTarjeta} hover:border-blue-300 hover:bg-blue-50`}
            >
              <span className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                <Phone className="h-5 w-5" />
              </span>
              <span className="text-sm font-medium text-gray-700">Llamar</span>
            </a>
          ) : (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuLlamarAbierto((v) => !v)}
                className={`${claseBaseTarjeta} hover:border-blue-300 hover:bg-blue-50`}
              >
                <span className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Phone className="h-5 w-5" />
                </span>
                <span className="text-sm font-medium text-gray-700">
                  Llamar
                </span>
              </button>
              {menuLlamarAbierto && (
                <div className="absolute left-0 z-10 mt-2 w-max min-w-[180px] rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={copiarNumero}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Copy className="h-4 w-4 text-gray-400" />
                    <span>Copiar número</span>
                  </button>
                  <button
                    type="button"
                    onClick={enviarAlMovil}
                    disabled={enviandoAlMovil}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <Smartphone className="h-4 w-4 text-gray-400" />
                    <span>
                      {enviandoAlMovil
                        ? "Enviando..."
                        : "Enviar a mi móvil"}
                    </span>
                  </button>
                </div>
              )}
            </div>
          ))}

        {isMobile ? (
          <a
            href={`mailto:${cliente.email}?subject=Contacto desde CRM&body=Hola ${cliente.nombre},`}
            onClick={onEmailMovil}
            className={`${claseBaseTarjeta} hover:border-green-300 hover:bg-green-50`}
          >
            <span className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
              <Mail className="h-5 w-5" />
            </span>
            <span className="text-sm font-medium text-gray-700">
              Enviar Email
            </span>
          </a>
        ) : (
          <button
            type="button"
            onClick={onEmailDesktop}
            className={`${claseBaseTarjeta} hover:border-green-300 hover:bg-green-50`}
          >
            <span className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
              <Mail className="h-5 w-5" />
            </span>
            <span className="text-sm font-medium text-gray-700">
              Enviar Email
            </span>
          </button>
        )}

        {tieneTelefono && (
          <a
            href={`https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(
              `Hola ${cliente.nombre}, le saludamos de Sumichem.`,
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`${claseBaseTarjeta} hover:border-emerald-300 hover:bg-emerald-50`}
          >
            <span className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <MessageCircle className="h-5 w-5" />
            </span>
            <span className="text-sm font-medium text-gray-700">WhatsApp</span>
          </a>
        )}

        <button
          type="button"
          onClick={onAgendarReunion}
          className={`${claseBaseTarjeta} hover:border-purple-300 hover:bg-purple-50`}
        >
          <span className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
            <Calendar className="h-5 w-5" />
          </span>
          <span className="text-sm font-medium text-gray-700">
            Agendar Reunión
          </span>
        </button>

        <button
          type="button"
          onClick={onCrearPedido}
          className={`${claseBaseTarjeta} hover:border-orange-300 hover:bg-orange-50`}
        >
          <span className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
            <FileText className="h-5 w-5" />
          </span>
          <span className="text-sm font-medium text-gray-700">Crear Pedido</span>
        </button>
      </div>

      {esAdmin && (onAsignarVendedor || onEliminarDefinitivamente) && (
        <div className="border-t border-gray-100 pt-4 mt-4">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Administración
          </h4>
          <div className="space-y-2">
            {onAsignarVendedor && (
              <button
                type="button"
                onClick={onAsignarVendedor}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors"
              >
                <UserCheck className="h-4 w-4" />
                <span>Asignar Vendedor</span>
              </button>
            )}
            {onEliminarDefinitivamente && (
              <button
                type="button"
                onClick={onEliminarDefinitivamente}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash className="h-4 w-4" />
                <span>Eliminar Definitivamente</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
