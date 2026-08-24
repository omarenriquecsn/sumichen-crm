import React, { useState } from "react";
import { Layout } from "../../components/layout/Layout";
import { useAuth } from "../../context/useAuth";

import {
  User,
  Bell,
  Shield,
  // Database,
  // Palette,
  Globe,
  Save,
  Eye,
  EyeOff,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { toast } from "react-toastify";

export const Configuracion: React.FC = () => {
  const { userData, session } = useAuth();
  const [activeTab, setActiveTab] = useState("perfil");
  const [showPassword, setShowPassword] = useState(false);

  const [perfilData, setPerfilData] = useState({
    nombre: userData?.nombre || "",
    apellido: userData?.apellido || "",
    email: session?.user.user_metadata.email || "",
    telefono: userData?.telefono || "",
    avatar: userData?.avatar || "",
  });

  const [notificaciones, setNotificaciones] = useState({
    emailNuevosClientes: true,
    emailReuniones: true,
    emailTickets: true,
    pushNotificaciones: false,
    resumenSemanal: true,
  });

  const [configuracionGeneral, setConfiguracionGeneral] = useState({
    idioma: "es",
    zona_horaria: "America/Mexico_City",
    formato_fecha: "DD/MM/YYYY",
    moneda: "MXN",
  });

  const tabs = [
    { id: "perfil", label: "Perfil", icon: User },
    { id: "notificaciones", label: "Notificaciones", icon: Bell },
    { id: "seguridad", label: "Seguridad", icon: Shield },
    { id: "general", label: "General", icon: Globe },
  ];

  const handlePerfilChange = (field: string, value: string) => {
    setPerfilData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNotificacionChange = (field: string, value: boolean) => {
    setNotificaciones((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleGeneralChange = (field: string, value: string) => {
    setConfiguracionGeneral((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = () => {
    // Aquí implementarías la lógica para guardar la configuración
    console.log("Guardando configuración...");
  };

 const handleSeguridadChange = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  const form = e.currentTarget;
  const oldPassword = (form.elements.namedItem("oldPassword") as HTMLInputElement).value;
  const newPassword = (form.elements.namedItem("newPassword") as HTMLInputElement).value;
  const confirmPassword = (form.elements.namedItem("confirmPassword") as HTMLInputElement).value;

  // Validar nueva contraseña
  if (newPassword.length < 6) {
    toast.error("La nueva contraseña debe tener al menos 6 caracteres.");
    return;
  }
  if (newPassword !== confirmPassword) {
    toast.error("Las contraseñas nuevas no coinciden.");
    return;
  }

  // Verificar la contraseña antigua
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: perfilData.email,
    password: oldPassword,
  });

  if (signInError) {
    alert("Contraseña actual incorrecta.");
    return;
  }

  // Actualizar la contraseña
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    alert("Error al cambiar la contraseña: " + updateError.message);
    return;
  }

  alert("Contraseña actualizada correctamente.");
};
  return (
    <Layout
      title="Configuración"
      subtitle="Personaliza tu experiencia en el CRM"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Navegación lateral */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <nav className="space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <tab.icon className="h-5 w-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Contenido principal */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              {/* Perfil */}
              {activeTab === "perfil" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Información Personal
                    </h3>

                    {/* Avatar */}
                    <div className="flex items-center space-x-6 mb-6">
                      <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-bold text-2xl">
                          {perfilData.nombre.charAt(0)}
                          {perfilData.apellido.charAt(0)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nombre
                        </label>
                        <input
                          type="text"
                          value={perfilData.nombre}
                          onChange={(e) =>
                            handlePerfilChange("nombre", e.target.value)
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Apellido
                        </label>
                        <input
                          type="text"
                          value={perfilData.apellido}
                          onChange={(e) =>
                            handlePerfilChange("apellido", e.target.value)
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          value={perfilData.email}
                          disabled
                         
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Teléfono
                        </label>
                        <input
                          type="tel"
                          value={perfilData.telefono}
                          onChange={(e) =>
                            handlePerfilChange("telefono", e.target.value)
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notificaciones */}
              {activeTab === "notificaciones" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Preferencias de Notificación
                    </h3>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-3 border-b border-gray-200">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            Nuevos Clientes
                          </h4>
                          <p className="text-sm text-gray-500">
                            Recibir notificaciones por email cuando se registren
                            nuevos clientes
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notificaciones.emailNuevosClientes}
                            onChange={(e) =>
                              handleNotificacionChange(
                                "emailNuevosClientes",
                                e.target.checked
                              )
                            }
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between py-3 border-b border-gray-200">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            Recordatorios de Reuniones
                          </h4>
                          <p className="text-sm text-gray-500">
                            Recibir recordatorios por email antes de las
                            reuniones
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notificaciones.emailReuniones}
                            onChange={(e) =>
                              handleNotificacionChange(
                                "emailReuniones",
                                e.target.checked
                              )
                            }
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between py-3 border-b border-gray-200">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            Tickets de Soporte
                          </h4>
                          <p className="text-sm text-gray-500">
                            Notificaciones sobre nuevos tickets y
                            actualizaciones
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notificaciones.emailTickets}
                            onChange={(e) =>
                              handleNotificacionChange(
                                "emailTickets",
                                e.target.checked
                              )
                            }
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between py-3 border-b border-gray-200">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            Resumen Semanal
                          </h4>
                          <p className="text-sm text-gray-500">
                            Recibir un resumen semanal de actividades y métricas
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notificaciones.resumenSemanal}
                            onChange={(e) =>
                              handleNotificacionChange(
                                "resumenSemanal",
                                e.target.checked
                              )
                            }
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Seguridad */}
              {activeTab === "seguridad" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Configuración de Seguridad
                    </h3>

                    <div className="space-y-6">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">
                          Cambiar Contraseña
                        </h4>
                        <form className="space-y-4" onSubmit={handleSeguridadChange}>
                          <div>
                            <label htmlFor="oldPassword" className="block text-sm font-medium text-gray-700 mb-2">
                              Contraseña Actual
                            </label>
                            <div className="relative">
                              <input
                                id="oldPassword"
                                name="oldPassword"
                                type={showPassword ? "text" : "password"}
                                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="••••••••"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              >
                                {showPassword ? (
                                  <EyeOff className="h-5 w-5" />
                                ) : (
                                  <Eye className="h-5 w-5" />
                                )}
                              </button>
                            </div>
                          </div>

                          <div>
                            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                              Nueva Contraseña
                            </label>
                            <input
                              id="newPassword"
                              name="newPassword"
                              type="password"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="••••••••"
                            />
                          </div>

                          <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                              Confirmar Nueva Contraseña
                            </label>
                            <input
                              id="confirmPassword"
                              name="confirmPassword"
                              type="password"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="••••••••"
                            />
                          </div>

                          <button
                            type="submit"
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Actualizar Contraseña
                          </button>
                        </form>
                      </div>

                      <div className="border-t border-gray-200 pt-6">
                        <h4 className="font-medium text-gray-900 mb-3">
                          Sesiones Activas
                        </h4>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">
                                Navegador Actual
                              </p>
                              <p className="text-sm text-gray-500">
                                Chrome en Windows • Ciudad de México
                              </p>
                              <p className="text-xs text-gray-400">
                                Última actividad: hace 2 minutos
                              </p>
                            </div>
                            <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                              Activa
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* General */}
              {activeTab === "general" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Configuración General
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Idioma
                        </label>
                        <select
                          value={configuracionGeneral.idioma}
                          onChange={(e) =>
                            handleGeneralChange("idioma", e.target.value)
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="es">Español</option>
                          <option value="en">English</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Zona Horaria
                        </label>
                        <select
                          value={configuracionGeneral.zona_horaria}
                          onChange={(e) =>
                            handleGeneralChange("zona_horaria", e.target.value)
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="America/Mexico_City">
                            Ciudad de México (GMT-6)
                          </option>
                          <option value="America/New_York">
                            Nueva York (GMT-5)
                          </option>
                          <option value="Europe/Madrid">Madrid (GMT+1)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Formato de Fecha
                        </label>
                        <select
                          value={configuracionGeneral.formato_fecha}
                          onChange={(e) =>
                            handleGeneralChange("formato_fecha", e.target.value)
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                          <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Moneda
                        </label>
                        <select
                          value={configuracionGeneral.moneda}
                          onChange={(e) =>
                            handleGeneralChange("moneda", e.target.value)
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="MXN">Peso Mexicano (MXN)</option>
                          <option value="USD">Dólar Americano (USD)</option>
                          <option value="EUR">Euro (EUR)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Botón guardar */}
              <div className="border-t border-gray-200 pt-6 mt-8">
                <button
                  onClick={handleSave}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Save className="h-5 w-5" />
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
