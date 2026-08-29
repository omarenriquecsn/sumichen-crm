import React, { useEffect, useState } from "react";
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
  Smartphone,
  Send,
  Loader2,
  Trash2,
  Download,
  Fingerprint,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { toast } from "react-toastify";
import { useNotificacionesPush } from "../../hooks/useNotificacionesPush";
import { useInstalarApp } from "../../hooks/useInstalarApp";
import { InstalarAppModal } from "../../components/ui/InstalarAppModal";
import {
  registrarBiometrico,
  listarCredenciales,
  eliminarCredencial,
  soportaBiometria,
} from "../../lib/biometric";

export const Configuracion: React.FC = () => {
  const { userData, session } = useAuth();
  const [activeTab, setActiveTab] = useState("perfil");
  const [showPassword, setShowPassword] = useState(false);
  const push = useNotificacionesPush();
  const { disponible: instalable, instalar: instalarApp } = useInstalarApp();
  const [mostrarInstrucciones, setMostrarInstrucciones] = useState(false);
  const [credencialesBiometricas, setCredencialesBiometricas] = useState<
    { id: string; dispositivo: string | null; fecha_creacion: string }[]
  >([]);
  const [registrandoBiometrico, setRegistrandoBiometrico] = useState(false);

  const cargarCredenciales = async () => {
    try {
      const credenciales = await listarCredenciales();
      setCredencialesBiometricas(credenciales);
    } catch (err) {
      console.error("Error cargando credenciales:", err);
    }
  };

  const handleRegistrarBiometrico = async () => {
    setRegistrandoBiometrico(true);
    try {
      await registrarBiometrico();
      await cargarCredenciales();
      toast.success("Huella registrada. Ya puedes iniciar sesión con ella.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error registrando la huella.");
    } finally {
      setRegistrandoBiometrico(false);
    }
  };

  const handleEliminarBiometrico = async (id: string) => {
    try {
      await eliminarCredencial(id);
      await cargarCredenciales();
      toast.info("Huella eliminada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error eliminando la huella.");
    }
  };

  useEffect(() => {
    if (activeTab === "seguridad" && soportaBiometria()) {
      cargarCredenciales();
    }
  }, [activeTab]);

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

                  {/* Notificaciones push del dispositivo (PWA) */}
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Notificaciones en este dispositivo
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Instala la app y activa las notificaciones para recibir
                      alertas del CRM en tu celular o PC, incluso con la app
                      cerrada.
                    </p>

                    {push.estado === "no_soportado" && (
                      <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg text-sm">
                        Este navegador no soporta notificaciones push. Usa
                        Chrome, Edge, Safari (iOS 16.4+) o un navegador moderno
                        en tu dispositivo.
                      </div>
                    )}

                    {push.estado === "denegado" && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                        El permiso de notificaciones está bloqueado en este
                        dispositivo. Habilítalo desde la configuración del
                        navegador (sitio: permisos → notificaciones → permitir)
                        y vuelve a intentarlo.
                      </div>
                    )}

                    {push.estado === "pendiente" && (
                      <button
                        onClick={async () => {
                          const res = await push.activar();
                          if (res.ok) {
                            toast.success("Notificaciones activadas en este dispositivo.");
                          } else {
                            toast.error(res.error || "No se pudieron activar las notificaciones.");
                          }
                        }}
                        disabled={push.accionando}
                        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium px-4 py-2.5 rounded-lg transition-colors"
                      >
                        {push.accionando ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Bell className="h-4 w-4" />
                        )}
                        Activar notificaciones
                      </button>
                    )}

                    {push.estado === "activado" && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
                          <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                          Notificaciones activas en este dispositivo
                        </div>
                        <button
                          onClick={async () => {
                            const res = await push.enviarPrueba();
                            if (res.ok) {
                              toast.success("Notificación de prueba enviada. Revisa tu dispositivo.");
                            } else {
                              toast.error(res.error || "No se pudo enviar la prueba.");
                            }
                          }}
                          disabled={push.suscripcionDePrueba}
                          className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-900 disabled:opacity-50 text-white font-medium px-4 py-2.5 rounded-lg transition-colors"
                        >
                          {push.suscripcionDePrueba ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                          Enviar notificación de prueba
                        </button>

                        {push.suscripciones.length > 0 && (
                          <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                            {push.suscripciones.map((s) => (
                              <div
                                key={s.endpoint}
                                className="flex items-center justify-between px-4 py-3"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <Smartphone className="h-5 w-5 text-gray-400 flex-shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-sm text-gray-800 truncate">
                                      {s.dispositivo || "Dispositivo"}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                      {new Date(s.fecha_creacion).toLocaleDateString("es-VE")}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={() =>
                                    push.desactivar(s.endpoint).then(() =>
                                      toast.info("Dispositivo desvinculado.")
                                    )
                                  }
                                  disabled={push.accionando}
                                  className="text-gray-400 hover:text-red-600 disabled:opacity-50"
                                  title="Desactivar notificaciones en este dispositivo"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Instalar la app (solo si aún no está instalada) */}
                    {instalable && (
                      <div className="mt-6 border-t border-gray-200 pt-4">
                        <button
                          onClick={async () => {
                            const res = await instalarApp();
                            if (res.resultado === "instrucciones") {
                              setMostrarInstrucciones(true);
                            }
                          }}
                          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-lg transition-colors"
                        >
                          <Download className="h-4 w-4" />
                          Instalar app en este dispositivo
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <InstalarAppModal
                open={mostrarInstrucciones}
                onClose={() => setMostrarInstrucciones(false)}
              />

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
                          Acceso Biométrico (huella / rostro)
                        </h4>
                        <p className="text-sm text-gray-500 mb-4">
                          Registra este dispositivo para iniciar sesión en el CRM
                          con tu huella, rostro o PIN (Windows Hello, Android,
                          iPhone/iPad, Mac).
                        </p>

                        {!soportaBiometria() ? (
                          <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg text-sm">
                            Este navegador no soporta autenticación biométrica
                            (WebAuthn). Usa un navegador moderno con HTTPS.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <button
                              onClick={handleRegistrarBiometrico}
                              disabled={registrandoBiometrico}
                              className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-900 disabled:opacity-50 text-white font-medium px-4 py-2.5 rounded-lg transition-colors"
                            >
                              {registrandoBiometrico ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Fingerprint className="h-4 w-4" />
                              )}
                              Registrar este dispositivo
                            </button>

                            {credencialesBiometricas.length > 0 && (
                              <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                                {credencialesBiometricas.map((c) => (
                                  <div
                                    key={c.id}
                                    className="flex items-center justify-between px-4 py-3"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <Fingerprint className="h-5 w-5 text-gray-400 flex-shrink-0" />
                                      <div className="min-w-0">
                                        <p className="text-sm text-gray-800 truncate">
                                          {c.dispositivo || "Dispositivo"}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                          Registrado:{" "}
                                          {new Date(c.fecha_creacion).toLocaleDateString("es-VE")}
                                        </p>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => handleEliminarBiometrico(c.id)}
                                      className="text-gray-400 hover:text-red-600"
                                      title="Eliminar esta huella"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
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
