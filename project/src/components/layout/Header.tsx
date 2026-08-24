import React, { useEffect, useRef, useState } from "react";
import { Bell, CheckCircle, Menu, XCircle } from "lucide-react";
import { useNotificaciones } from "../../hooks/useNotificaciones";
import { useAuth } from "../../context/useAuth";
import { useEliminarNotificaciones } from "../../hooks/useNotificaciones";
// ...


interface HeaderProps {
  title: string;
  subtitle?: string;
  onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onMenuClick,
}) => {
  const { userData } = useAuth();

  const { data: notificaciones } = useNotificaciones(userData?.id ?? ""); // Reemplaza con el ID real del usuario
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { mutate: eliminarNotificaciones } = useEliminarNotificaciones(userData?.id ?? "");

// ...existing code...

  // Cierra el dropdown si se hace click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setMostrarDropdown(false);
      }
    }
    if (mostrarDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      // Si el dropdown estaba abierto y ahora se cierra, elimina las notificaciones
      if (mostrarDropdown) {
        eliminarNotificaciones();
      }
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [mostrarDropdown, eliminarNotificaciones]);

// ...existing code...

  // Cierra el dropdown si se hace click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setMostrarDropdown(false);
      }
    }
    if (mostrarDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [mostrarDropdown]);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-4 sm:px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={onMenuClick}
            className="lg:hidden mr-4 text-gray-600 hover:text-gray-900"
            aria-label="Abrir menú"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Barra de búsqueda */}
          {/* <div className="relative hidden sm:block">
            <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-48 lg:w-80"
            />
          </div> */}

          {/* Notificaciones */}
          <button
            className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            onClick={() => setMostrarDropdown(!mostrarDropdown)} // <-- Agrega esto
          >
            <Bell className="h-6 w-6" />
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {Array.isArray(notificaciones) && notificaciones.length > 0
                ? notificaciones.length
                : 0}
            </span>
          </button>

          {/* Chat */}
          {/* <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
            <MessageSquare className="h-6 w-6" />
          </button> */}
          {/* Dropdown de notificaciones */}
          {mostrarDropdown && (
            <div
              ref={dropdownRef}
              className="absolute right-10 top-5 mt-2 w-72 bg-white shadow-lg rounded-lg z-50 max-h-96 overflow-y-auto border border-gray-200"
            >
              {Array.isArray(notificaciones) && notificaciones.length === 0 ? (
                <div className="p-4 text-gray-500">Sin notificaciones</div>
              ) : (
                Array.isArray(notificaciones) &&
                notificaciones.map((n) => (
                  <div
                    key={n.id}
                     className="flex items-center gap-2 p-4 border-b last:border-b-0 text-sm text-gray-800"
                  >
                    {n.tipo === "aprobado" ? (
                      <CheckCircle className="text-green-600 w-5 h-5" />
                    ) : n.tipo === "cancelado" ? (
                      <XCircle className="text-red-600 w-5 h-5" />
                    ) : null}
                    <span>{n.descripcion}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
