import React from "react";
import { Layout } from "../../components/layout/Layout";
import { useSupabase } from "../../hooks/useSupabase";
import useUsuariosTodos from "../../hooks/useUsuariosTodos";
import { toast } from "react-toastify";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { Users, TrendingUp, Target, Clock, RefreshCw, Globe, Check, AlertCircle, MessageSquare, Bot, Plus, Trash2, Save, Megaphone } from "lucide-react";
import { Lead, OpcionIntencion, Vendedor, Campana } from "../../types";

const COLORS = ["#16A34A", "#2563EB", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16"];

const ORIGEN_META: Record<string, { label: string; color: string }> = {
  instagram: { label: "Instagram", color: "#E1306C" },
  web: { label: "Web", color: "#2563EB" },
  whatsapp: { label: "WhatsApp", color: "#16A34A" },
  desconocido: { label: "Desconocido", color: "#9CA3AF" },
};

const toLocalDateStr = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

interface PieLabelProps {
  origen?: string;
  valor?: number;
  percent?: number;
}

const MarketingDashboard: React.FC = () => {
  const { useLeads, useMenuBienvenida, useActualizarMenuBienvenida, useCampanas, useCrearCampana, useActualizarCampana, useEliminarCampana } = useSupabase();
  const { data: vendedores } = useUsuariosTodos();
  const { data: menuConfig, isLoading: menuLoading } = useMenuBienvenida();
  const actualizarMenu = useActualizarMenuBienvenida();
  const { data: campanas } = useCampanas();
  const crearCampana = useCrearCampana();
  const actualizarCampana = useActualizarCampana();
  const eliminarCampana = useEliminarCampana();
  const [fechaDesde, setFechaDesde] = React.useState(() => {
    const d = new Date();
    d.setDate(1);
    return toLocalDateStr(d);
  });
  const [fechaHasta, setFechaHasta] = React.useState(() => toLocalDateStr(new Date()));

  const [menuForm, setMenuForm] = React.useState({
    activo: true,
    mensaje_bienvenida: "",
    pregunta_estado: "",
    mensaje_sin_vendedor: "",
    pregunta_intencion: "",
    mensaje_confirmacion: "",
    mensaje_tipo_contacto: "",
    vendedor_proveedores_id: "",
    vendedor_trabajo_id: "",
    mensaje_proveedor: "",
    mensaje_trabajo: "",
    fin_semana_activo: true,
    mensaje_fin_semana: "",
    opciones_intencion: [] as OpcionIntencion[],
  });

  React.useEffect(() => {
    if (menuConfig) {
      setMenuForm({
        activo: menuConfig.activo ?? true,
        mensaje_bienvenida: menuConfig.mensaje_bienvenida || "",
        pregunta_estado: menuConfig.pregunta_estado || "",
        mensaje_sin_vendedor: menuConfig.mensaje_sin_vendedor || "",
        pregunta_intencion: menuConfig.pregunta_intencion || "",
        mensaje_confirmacion: menuConfig.mensaje_confirmacion || "",
        mensaje_tipo_contacto: menuConfig.mensaje_tipo_contacto || "",
        vendedor_proveedores_id: menuConfig.vendedor_proveedores_id || "",
        vendedor_trabajo_id: menuConfig.vendedor_trabajo_id || "",
        mensaje_proveedor: menuConfig.mensaje_proveedor || "",
        mensaje_trabajo: menuConfig.mensaje_trabajo || "",
        fin_semana_activo: menuConfig.fin_semana_activo ?? true,
        mensaje_fin_semana: menuConfig.mensaje_fin_semana || "",
        opciones_intencion: menuConfig.opciones_intencion || [],
      });
    }
  }, [menuConfig]);

  const handleSaveMenu = () => {
    const opciones = menuForm.opciones_intencion
      .filter((o) => o.etiqueta.trim())
      .map((o, i) => ({ numero: i + 1, etiqueta: o.etiqueta.trim(), tipo_web: o.tipo_web }));
    actualizarMenu.mutate(
      {
        activo: menuForm.activo,
        mensaje_bienvenida: menuForm.mensaje_bienvenida,
        pregunta_estado: menuForm.pregunta_estado,
        mensaje_sin_vendedor: menuForm.mensaje_sin_vendedor,
        pregunta_intencion: menuForm.pregunta_intencion,
        mensaje_confirmacion: menuForm.mensaje_confirmacion,
        mensaje_tipo_contacto: menuForm.mensaje_tipo_contacto,
        vendedor_proveedores_id: menuForm.vendedor_proveedores_id || null,
        vendedor_trabajo_id: menuForm.vendedor_trabajo_id || null,
        mensaje_proveedor: menuForm.mensaje_proveedor,
        mensaje_trabajo: menuForm.mensaje_trabajo,
        fin_semana_activo: menuForm.fin_semana_activo,
        mensaje_fin_semana: menuForm.mensaje_fin_semana,
        opciones_intencion: opciones,
      },
      {
        onSuccess: () => toast.success("Menú de bienvenida actualizado"),
        onError: (err) => toast.error(err.message || "Error al guardar el menú"),
      }
    );
  };

  const setOpcion = (idx: number, patch: Partial<OpcionIntencion>) => {
    setMenuForm((prev) => ({
      ...prev,
      opciones_intencion: prev.opciones_intencion.map((o, i) => (i === idx ? { ...o, ...patch } : o)),
    }));
  };

  // Campañas publicitarias (palabras clave de origen)
  const [nuevaCampana, setNuevaCampana] = React.useState({ palabra_clave: "", descripcion: "" });
  const [campanaEdits, setCampanaEdits] = React.useState<Record<string, { palabra_clave: string; descripcion: string }>>({});

  const valorCampana = (c: Campana) =>
    campanaEdits[c.id] ?? { palabra_clave: c.palabra_clave, descripcion: c.descripcion || "" };

  const setCampanaEdit = (c: Campana, patch: Partial<{ palabra_clave: string; descripcion: string }>) =>
    setCampanaEdits((prev) => ({ ...prev, [c.id]: { ...valorCampana(c), ...patch } }));

  const handleAgregarCampana = () => {
    const palabra = nuevaCampana.palabra_clave.trim();
    if (!palabra) {
      toast.error("Escribe una palabra clave");
      return;
    }
    crearCampana.mutate(
      { palabra_clave: palabra, descripcion: nuevaCampana.descripcion.trim() || undefined },
      {
        onSuccess: () => {
          toast.success("Campaña agregada");
          setNuevaCampana({ palabra_clave: "", descripcion: "" });
        },
        onError: (err) => toast.error(err.message || "Error al crear la campaña"),
      }
    );
  };

  const handleGuardarCampana = (c: Campana) => {
    const edit = campanaEdits[c.id];
    if (!edit) return;
    actualizarCampana.mutate(
      { id: c.id, palabra_clave: edit.palabra_clave.trim(), descripcion: edit.descripcion.trim() || null },
      {
        onSuccess: () => {
          toast.success("Campaña actualizada");
          setCampanaEdits((prev) => {
            const next = { ...prev };
            delete next[c.id];
            return next;
          });
        },
        onError: (err) => toast.error(err.message || "Error al actualizar la campaña"),
      }
    );
  };

  const handleToggleCampana = (c: Campana) => {
    actualizarCampana.mutate(
      { id: c.id, activa: !c.activa },
      { onError: (err) => toast.error(err.message || "Error al actualizar la campaña") }
    );
  };

  const handleEliminarCampana = (c: Campana) => {
    if (!window.confirm(`¿Eliminar la campaña "${c.palabra_clave}"?`)) return;
    eliminarCampana.mutate(c.id, {
      onSuccess: () => toast.success("Campaña eliminada"),
      onError: (err) => toast.error(err.message || "Error al eliminar la campaña"),
    });
  };

  const { data, isLoading, refetch } = useLeads(undefined, {
    desde: fechaDesde ? new Date(`${fechaDesde}T00:00:00`).toISOString() : undefined,
    hasta: fechaHasta ? new Date(`${fechaHasta}T23:59:59.999`).toISOString() : undefined,
    limit: 1000,
  });

  const leads: Lead[] = data?.data || [];

  // KPIs
  const totalLeads = leads.length;
  const leadsPorOrigen = leads.reduce((acc, l) => {
    acc[l.origen] = (acc[l.origen] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const leadsPorEstado = leads.reduce((acc, l) => {
    acc[l.estado] = (acc[l.estado] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const leadsPorZona = leads.reduce((acc, l) => {
    const zona = l.zona?.nombre || "Sin zona";
    acc[zona] = (acc[zona] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const convertidos = leads.filter((l) => l.estado === "convertido").length;
  const tasaConversion = totalLeads > 0 ? ((convertidos / totalLeads) * 100).toFixed(1) : "0";
  const enGestion = leads.filter((l) => ["asignado", "contactado", "calificado"].includes(l.estado)).length;
  const sinAsignar = leads.filter((l) => l.estado === "nuevo").length;
  const tiempoRespuestaPromedio = "—"; // TODO: calcular desde mensajes

  // Datos para gráficas
  const datosOrigen = Object.entries(leadsPorOrigen).map(([origen, valor]) => ({
    origen: ORIGEN_META[origen]?.label || origen,
    valor,
    color: ORIGEN_META[origen]?.color || "#9CA3AF",
  }));
  const datosEstado = Object.entries(leadsPorEstado).map(([estado, valor]) => ({ estado, valor }));
  const datosZona = Object.entries(leadsPorZona).map(([zona, valor]) => ({ zona, valor }));

  // Leads por palabra clave de campaña (incluye los que no coincidieron)
  const sinPalabraClave = leads.filter((l) => !l.palabra_clave).length;
  const datosPalabraClave = [
    ...(campanas || []).map((c) => ({
      palabra_clave: c.palabra_clave,
      valor: leads.filter((l) => l.palabra_clave === c.palabra_clave).length,
      activa: c.activa,
    })),
    { palabra_clave: "Sin palabra clave", valor: sinPalabraClave, activa: true },
  ].sort((a, b) => b.valor - a.valor);

  // Leads por día (últimos 30 días)
  const leadsPorDia = leads.reduce((acc, l) => {
    const dia = toLocalDateStr(new Date(l.fecha_creacion));
    if (dia >= fechaDesde && dia <= fechaHasta) {
      acc[dia] = (acc[dia] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const datosTemporal = Object.entries(leadsPorDia)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, valor]) => ({
      fecha: new Date(fecha).toLocaleDateString("es-VE", { day: "2-digit", month: "2-digit" }),
      valor,
    }));

  return (
    <Layout title="Dashboard de Marketing" subtitle="Métricas de leads entrantes y conversión">
      <div className="space-y-6">
        {/* Filtros de fecha */}
        <div className="bg-white rounded-xl shadow-lg p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-stretch sm:items-end w-full sm:w-auto">
            <div className="w-full sm:w-auto">
              <label className="block text-xs font-medium text-gray-500 mb-1">Desde</label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full sm:w-auto border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="w-full sm:w-auto">
              <label className="block text-xs font-medium text-gray-500 mb-1">Hasta</label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-full sm:w-auto border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 sm:mb-0.5"
            >
              <RefreshCw className="h-4 w-4 inline mr-1" /> Actualizar
            </button>
          </div>
        </div>

        {/* Asistente / Menú de Bienvenida WhatsApp */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Bot className="h-5 w-5 text-blue-600" /> Menú de Bienvenida (WhatsApp)
              </h3>
              <p className="text-sm text-gray-500">
                Asistente automático: pregunta al lead el estado y auto-asigna el vendedor de la zona. Las zonas y sus
                estados se gestionan en <span className="font-medium">Zonas</span>.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                checked={menuForm.activo}
                onChange={(e) => setMenuForm((prev) => ({ ...prev, activo: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              <span className="ml-3 text-sm font-medium text-gray-700">{menuForm.activo ? "Activo" : "Inactivo"}</span>
            </label>
          </div>

          {menuLoading ? (
            <div className="text-center py-6 text-gray-500">Cargando configuración...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3 md:col-span-2">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Mensaje de bienvenida</label>
                  <textarea
                    value={menuForm.mensaje_bienvenida}
                    onChange={(e) => setMenuForm((prev) => ({ ...prev, mensaje_bienvenida: e.target.value }))}
                    rows={2}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="¡Hola {nombre}! ..."
                  />
                  <p className="text-xs text-gray-400">Variables disponibles: {"{nombre}"}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Pregunta de estado</label>
                  <textarea
                    value={menuForm.pregunta_estado}
                    onChange={(e) => setMenuForm((prev) => ({ ...prev, pregunta_estado: e.target.value }))}
                    rows={2}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder='¿De qué estado nos escribes? Responde con el número:\n{opciones}'
                  />
                  <p className="text-xs text-gray-400">Variable: {"{opciones}"} se reemplaza con la lista numerada de estados.</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Mensaje sin vendedor disponible</label>
                  <textarea
                    value={menuForm.mensaje_sin_vendedor}
                    onChange={(e) => setMenuForm((prev) => ({ ...prev, mensaje_sin_vendedor: e.target.value }))}
                    rows={2}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Gracias por tu información, {nombre}. Un asesor te contactará."
                  />
                </div>
              </div>

              {/* Tipo de contacto (primera pregunta del asistente) */}
              <div className="md:col-span-2 border-t border-gray-100 pt-4">
                <label className="block text-xs font-medium text-gray-500 mb-1">Primera pregunta — tipo de contacto</label>
                <p className="text-xs text-gray-400 mb-2">
                  Al recibir el primer mensaje de WhatsApp sin vendedor, el bot pregunta si es <b>Cliente</b>,{" "}
                  <b>Proveedor</b> o <b>Busca trabajo</b>. Cliente sigue el flujo de ventas por zona; proveedor y
                  trabajo se asignan directamente al usuario configurado abajo.
                </p>
                <textarea
                  value={menuForm.mensaje_tipo_contacto}
                  onChange={(e) => setMenuForm((prev) => ({ ...prev, mensaje_tipo_contacto: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder='¡Hola {nombre}! ¿Cómo podemos ayudarte?\n{opciones}'
                />
                <p className="text-xs text-gray-400 mt-1">Variable: {"{opciones}"} se reemplaza con 1. Cliente · 2. Proveedor · 3. Busco trabajo.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Usuario que recibe proveedores</label>
                    <select
                      value={menuForm.vendedor_proveedores_id}
                      onChange={(e) => setMenuForm((prev) => ({ ...prev, vendedor_proveedores_id: e.target.value }))}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Sin asignar</option>
                      {(vendedores || []).map((v: Vendedor) => (
                        <option key={v.id} value={v.id}>
                          {v.nombre} {v.apellido} · {v.rol === "admin" ? "Admin" : "Vendedor"}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Usuario que recibe postulantes de trabajo</label>
                    <select
                      value={menuForm.vendedor_trabajo_id}
                      onChange={(e) => setMenuForm((prev) => ({ ...prev, vendedor_trabajo_id: e.target.value }))}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Sin asignar</option>
                      {(vendedores || []).map((v: Vendedor) => (
                        <option key={v.id} value={v.id}>
                          {v.nombre} {v.apellido} · {v.rol === "admin" ? "Admin" : "Vendedor"}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Mensaje de confirmación — Proveedor</label>
                    <textarea
                      value={menuForm.mensaje_proveedor}
                      onChange={(e) => setMenuForm((prev) => ({ ...prev, mensaje_proveedor: e.target.value }))}
                      rows={2}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Gracias {nombre}. {vendedor} se comunicará contigo por este medio."
                    />
                    <p className="text-xs text-gray-400 mt-1">Variables: {"{nombre}"}, {"{vendedor}"}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Mensaje de confirmación — Busco trabajo</label>
                    <textarea
                      value={menuForm.mensaje_trabajo}
                      onChange={(e) => setMenuForm((prev) => ({ ...prev, mensaje_trabajo: e.target.value }))}
                      rows={2}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Gracias {nombre}. {vendedor} se comunicará contigo por este medio."
                    />
                    <p className="text-xs text-gray-400 mt-1">Variables: {"{nombre}"}, {"{vendedor}"}</p>
                  </div>
                </div>
              </div>

              {/* Atención en fin de semana */}
              <div className="md:col-span-2 border-t border-gray-100 pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Atención en fin de semana (sábado y domingo)
                    </label>
                    <p className="text-xs text-gray-400">
                      Los leads de WhatsApp <b>sin vendedor</b> que escriban sábado o domingo reciben este mensaje con el
                      horario (una vez por día) y el asistente queda en pausa. El próximo día hábil se reanuda el flujo de
                      asignación automáticamente.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                    <input
                      type="checkbox"
                      checked={menuForm.fin_semana_activo}
                      onChange={(e) => setMenuForm((prev) => ({ ...prev, fin_semana_activo: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    <span className="ml-3 text-sm font-medium text-gray-700">
                      {menuForm.fin_semana_activo ? "Activo" : "Inactivo"}
                    </span>
                  </label>
                </div>
                <textarea
                  value={menuForm.mensaje_fin_semana}
                  onChange={(e) => setMenuForm((prev) => ({ ...prev, mensaje_fin_semana: e.target.value }))}
                  rows={3}
                  className="w-full mt-3 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="¡Gracias por escribir a Sumichem! Nuestro horario de atención es de lunes a viernes de 8:00 a.m. a 5:00 p.m..."
                />
                <p className="text-xs text-gray-400 mt-1">Variable: {"{nombre}"}</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Confirmación del vendedor (con teléfono)</label>
                <textarea
                  value={menuForm.pregunta_intencion}
                  onChange={(e) => setMenuForm((prev) => ({ ...prev, pregunta_intencion: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="{vendedor} ({telefono_vendedor}) de la zona {zona} te atenderá. ¿Qué necesitas?\n{opciones}"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Variables: {"{nombre}"}, {"{vendedor}"}, {"{telefono_vendedor}"}, {"{zona}"}, {"{opciones}"}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Mensaje de confirmación</label>
                <textarea
                  value={menuForm.mensaje_confirmacion}
                  onChange={(e) => setMenuForm((prev) => ({ ...prev, mensaje_confirmacion: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="¡Listo, {nombre}! {vendedor} ({telefono_vendedor}) te contactará."
                />
                <p className="text-xs text-gray-400 mt-1">Variables: {"{nombre}"}, {"{vendedor}"}, {"{telefono_vendedor}"}</p>
              </div>

              {/* Opciones de intención */}
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Opciones de intención (se guardan en tipo_web)</label>
                <div className="space-y-2">
                  {menuForm.opciones_intencion.map((op, i) => (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 rounded-lg sm:p-0 sm:bg-transparent bg-gray-50">
                      <span className="w-8 h-8 bg-blue-100 text-blue-700 rounded flex items-center justify-center font-semibold text-sm shrink-0">
                        {i + 1}
                      </span>
                      <input
                        value={op.etiqueta}
                        onChange={(e) => setOpcion(i, { etiqueta: e.target.value })}
                        className="w-full sm:flex-1 sm:min-w-0 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Etiqueta (ej. Cotización)"
                      />
                      <select
                        value={op.tipo_web}
                        onChange={(e) => setOpcion(i, { tipo_web: e.target.value as OpcionIntencion["tipo_web"] })}
                        className="w-full sm:w-40 sm:shrink-0 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="cotizacion">Cotización</option>
                        <option value="catalogo">Catálogo</option>
                      </select>
                      <button
                        onClick={() =>
                          setMenuForm((prev) => ({
                            ...prev,
                            opciones_intencion: prev.opciones_intencion.filter((_, idx) => idx !== i),
                          }))
                        }
                        className="text-red-500 hover:text-red-700 shrink-0 self-end sm:self-auto"
                        title="Quitar opción"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() =>
                      setMenuForm((prev) => ({
                        ...prev,
                        opciones_intencion: [...prev.opciones_intencion, { numero: prev.opciones_intencion.length + 1, etiqueta: "", tipo_web: "cotizacion" }],
                      }))
                    }
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    <Plus className="h-4 w-4" /> Agregar opción
                  </button>
                </div>
              </div>

              <div className="md:col-span-2 flex justify-end">
                <button
                  onClick={handleSaveMenu}
                  disabled={actualizarMenu.isPending}
                  className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 font-medium"
                >
                  <Save className="h-4 w-4" />
                  {actualizarMenu.isPending ? "Guardando..." : "Guardar menú"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Campañas publicitarias (palabras clave de origen) */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-purple-600" /> Campañas publicitarias — Palabras clave
            </h3>
            <p className="text-sm text-gray-500">
              Si el <b>primer mensaje</b> de un lead de WhatsApp contiene una de estas palabras clave, el lead queda
              atribuido a esa campaña. También se detecta el origen: <b>instagram</b> si menciona "instagram",{" "}
              <b>web</b> si incluye "https"/"www"/"web", y <b>desconocido</b> si no coincide ninguna.
            </p>
          </div>

          {/* Agregar campaña */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <input
              value={nuevaCampana.palabra_clave}
              onChange={(e) => setNuevaCampana((prev) => ({ ...prev, palabra_clave: e.target.value }))}
              placeholder="Palabra clave (ej. promo verano)"
              className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <input
              value={nuevaCampana.descripcion}
              onChange={(e) => setNuevaCampana((prev) => ({ ...prev, descripcion: e.target.value }))}
              placeholder="Descripción (opcional, ej. Facebook julio)"
              className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={handleAgregarCampana}
              disabled={crearCampana.isPending}
              className="flex items-center justify-center gap-2 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 text-sm font-medium shrink-0"
            >
              <Plus className="h-4 w-4" /> Agregar
            </button>
          </div>

          {/* Lista de campañas */}
          {!(campanas || []).length ? (
            <p className="text-sm text-gray-400 py-4 text-center">Aún no hay campañas configuradas.</p>
          ) : (
            <div className="space-y-2">
              {(campanas || []).map((c) => {
                const edit = valorCampana(c);
                const dirty =
                  !!campanaEdits[c.id] &&
                  (edit.palabra_clave !== c.palabra_clave || edit.descripcion !== (c.descripcion || ""));
                return (
                  <div key={c.id} className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 rounded-lg bg-gray-50">
                    <input
                      value={edit.palabra_clave}
                      onChange={(e) => setCampanaEdit(c, { palabra_clave: e.target.value })}
                      className="w-full sm:flex-1 sm:min-w-0 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <input
                      value={edit.descripcion}
                      onChange={(e) => setCampanaEdit(c, { descripcion: e.target.value })}
                      placeholder="Descripción"
                      className="w-full sm:flex-1 sm:min-w-0 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      onClick={() => handleGuardarCampana(c)}
                      disabled={!dirty || actualizarCampana.isPending}
                      className={`shrink-0 flex items-center justify-center gap-1 px-3 py-2 rounded text-sm font-medium ${
                        dirty ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-100 text-gray-400 cursor-not-allowed"
                      }`}
                      title="Guardar cambios"
                    >
                      <Save className="h-4 w-4" /> Guardar
                    </button>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 self-end sm:self-auto">
                      <input
                        type="checkbox"
                        checked={c.activa}
                        onChange={() => handleToggleCampana(c)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      <span className="ml-2 text-xs text-gray-600">{c.activa ? "Activa" : "Inactiva"}</span>
                    </label>
                    <button
                      onClick={() => handleEliminarCampana(c)}
                      className="text-red-500 hover:text-red-700 shrink-0 self-end sm:self-auto"
                      title="Eliminar campaña"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* KPIs Principales */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Leads</p>
                <p className="text-3xl font-bold text-gray-900">{totalLeads}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Tasa Conversión</p>
                <p className="text-3xl font-bold text-green-600">{tasaConversion}%</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <Target className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">En Gestión</p>
                <p className="text-3xl font-bold text-yellow-600">{enGestion}</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-lg">
                <TrendingUp className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Sin Asignar</p>
                <p className="text-3xl font-bold text-red-600">{sinAsignar}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-lg">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Segunda fila KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Convertidos</p>
                <p className="text-3xl font-bold text-green-700">{convertidos}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <Check className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Tiempo Respuesta Prom.</p>
                <p className="text-3xl font-bold text-gray-900">{tiempoRespuestaPromedio}</p>
              </div>
              <div className="bg-gray-100 p-3 rounded-lg">
                <Clock className="h-6 w-6 text-gray-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Origen Instagram</p>
                <p className="text-3xl font-bold text-pink-600">{leadsPorOrigen.instagram || 0}</p>
              </div>
              <div className="bg-pink-100 p-3 rounded-lg">
                <MessageSquare className="h-6 w-6 text-pink-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Origen Web</p>
                <p className="text-3xl font-bold text-blue-600">{leadsPorOrigen.web || 0}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Globe className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Gráficas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Leads por Origen - Pie */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Leads por Origen</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={datosOrigen.length > 0 ? datosOrigen : [{ origen: "Sin datos", valor: 1, color: "#E5E7EB" }]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="valor"
                    nameKey="origen"
                    label={({ origen, valor, percent }: PieLabelProps) => `${origen}: ${valor} (${((percent || 0) * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {datosOrigen.map((_, i) => (
                      <Cell key={`cell-${i}`} fill={datosOrigen[i]?.color || COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(valor) => [valor, "leads"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Leads por Zona - Bar */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Leads por Zona</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={datosZona.length > 0 ? datosZona : [{ zona: "Sin datos", valor: 0 }]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="zona" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip formatter={(valor) => [valor, "leads"]} />
                  <Bar dataKey="valor" fill="#16A34A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Leads por Estado - Bar horizontal */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Leads por Estado</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={datosEstado.length > 0 ? datosEstado : [{ estado: "Sin datos", valor: 0 }]} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="estado" type="category" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(valor) => [valor, "leads"]} />
                  <Bar dataKey="valor" fill="#2563EB" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Leads por Palabra Clave - Bar */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Leads por Palabra Clave</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={datosPalabraClave.length > 0 ? datosPalabraClave : [{ palabra_clave: "Sin datos", valor: 0, activa: true }]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="palabra_clave" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
                  <YAxis />
                  <Tooltip formatter={(valor) => [valor, "leads"]} />
                  <Bar dataKey="valor" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Leads temporales - Line */}
          <div className="bg-white rounded-xl shadow-lg p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Leads por Día (últimos 30 días)</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={datosTemporal.length > 0 ? datosTemporal : [{ fecha: "Sin datos", valor: 0 }]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip formatter={(valor) => [valor, "leads"]} />
                  <Line
                    type="monotone"
                    dataKey="valor"
                    stroke="#16A34A"
                    strokeWidth={2}
                    dot={{ fill: "#16A34A", strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Top tipo web */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tipos de Solicitud</h3>
          <div className="flex flex-wrap gap-4">
            {[
              { key: "cotizacion", label: "Cotización" },
              { key: "proveedor", label: "Proveedor" },
              { key: "trabajo", label: "Busca trabajo" },
              { key: "catalogo", label: "Catálogo" },
            ].map((tipo) => {
              const count = leads.filter((l) => l.tipo_web === tipo.key).length;
              return (
                <div key={tipo.key} className="flex-1 min-w-[150px] bg-gray-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
                  <p className="text-sm text-gray-500">{tipo.label}</p>
                </div>
              );
            })}
          </div>
        </div>
        {/* Contador por palabra clave de campaña */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Leads por Campaña (Palabra clave)</h3>
          <div className="flex flex-wrap gap-4">
            {datosPalabraClave.map((d) => (
              <div key={d.palabra_clave} className="flex-1 min-w-[150px] bg-gray-50 p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-gray-900">{d.valor}</p>
                <p className="text-sm text-gray-500 break-words">{d.palabra_clave}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

// Iconos faltantes

export default MarketingDashboard;