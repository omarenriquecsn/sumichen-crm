import React from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  List,
  LayoutGrid,
  Trash2,
  Repeat,
  Plus,
} from "lucide-react";
import { DiaNoLaborable } from "../../types";

type Vista = "calendario" | "lista" | "tarjetas";

interface DiasNoLaborablesModalProps {
  isOpen: boolean;
  onClose: () => void;
  dias: DiaNoLaborable[];
  creando: boolean;
  onCrear: (data: {
    fecha: string;
    descripcion?: string;
    recurrente_anual: boolean;
  }) => Promise<boolean>;
  onEliminar: (d: DiaNoLaborable) => void;
}

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const pad = (n: number) => String(n).padStart(2, "0");

const toFechaStr = (fecha: Date) =>
  `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}`;

const parseFecha = (fecha: string): Date => {
  const [anio, mes, dia] = fecha.slice(0, 10).split("-").map(Number);
  return new Date(anio, mes - 1, dia);
};

const mesDia = (fecha: string) => fecha.slice(5, 10);

const formatearFecha = (d: DiaNoLaborable) => {
  const [anio, mes, dia] = d.fecha.slice(0, 10).split("-");
  return d.recurrente_anual ? `${dia}/${mes}` : `${dia}/${mes}/${anio}`;
};

const formatearFechaLarga = (fecha: Date) => {
  const diaSemana = DIAS_SEMANA[(fecha.getDay() + 6) % 7];
  return `${diaSemana} ${fecha.getDate()} de ${MESES[fecha.getMonth()]} de ${fecha.getFullYear()}`;
};

const TABS: { valor: Vista; label: string; Icono: React.ComponentType<{ className?: string }> }[] = [
  { valor: "calendario", label: "Calendario", Icono: CalendarDays },
  { valor: "lista", label: "Lista", Icono: List },
  { valor: "tarjetas", label: "Tarjetas", Icono: LayoutGrid },
];

const DiasNoLaborablesModal: React.FC<DiasNoLaborablesModalProps> = ({
  isOpen,
  onClose,
  dias,
  creando,
  onCrear,
  onEliminar,
}) => {
  const [vista, setVista] = React.useState<Vista>("calendario");
  const [mesVisible, setMesVisible] = React.useState(() => {
    const hoy = new Date();
    return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  });
  const [diaSeleccionado, setDiaSeleccionado] = React.useState<Date | null>(null);
  const [descripcion, setDescripcion] = React.useState("");
  const [recurrente, setRecurrente] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflowPrevio;
    };
  }, [isOpen, onClose]);

  React.useEffect(() => {
    if (!isOpen) {
      setDiaSeleccionado(null);
      setDescripcion("");
      setRecurrente(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const feriadosEn = (fecha: Date) => {
    const iso = toFechaStr(fecha);
    const md = iso.slice(5);
    return dias.filter((d) =>
      d.recurrente_anual ? mesDia(d.fecha) === md : d.fecha.slice(0, 10) === iso
    );
  };

  const anio = mesVisible.getFullYear();
  const mes = mesVisible.getMonth();
  const offset = (new Date(anio, mes, 1).getDay() + 6) % 7;
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();
  const totalCeldas = Math.ceil((offset + diasEnMes) / 7) * 7;

  const feriadosDelMes = dias
    .filter((d) => {
      if (d.recurrente_anual) return mesDia(d.fecha).slice(0, 2) === pad(mes + 1);
      const f = parseFecha(d.fecha);
      return f.getFullYear() === anio && f.getMonth() === mes;
    })
    .sort((a, b) => parseFecha(a.fecha).getDate() - parseFecha(b.fecha).getDate());

  const recurrentes = dias
    .filter((d) => d.recurrente_anual)
    .sort((a, b) => mesDia(a.fecha).localeCompare(mesDia(b.fecha)));

  const exactos = dias
    .filter((d) => !d.recurrente_anual)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  const feriadosSeleccionados = diaSeleccionado ? feriadosEn(diaSeleccionado) : [];

  const seleccionarDia = (fecha: Date) => {
    setDiaSeleccionado(fecha);
    setDescripcion("");
    setRecurrente(false);
  };

  const irHoy = () => {
    const hoy = new Date();
    setMesVisible(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
    seleccionarDia(hoy);
  };

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diaSeleccionado || creando) return;
    const ok = await onCrear({
      fecha: toFechaStr(diaSeleccionado),
      descripcion: descripcion.trim() || undefined,
      recurrente_anual: recurrente,
    });
    if (ok) {
      setDiaSeleccionado(null);
      setDescripcion("");
      setRecurrente(false);
    }
  };

  const botonEliminar = (d: DiaNoLaborable, mostrarTexto = false) => (
    <button
      type="button"
      onClick={() => {
        onEliminar(d);
        setDiaSeleccionado(null);
      }}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
      title="Eliminar día no laborable"
    >
      <Trash2 className="h-4 w-4" />
      {mostrarTexto ? "Eliminar" : null}
    </button>
  );

  const badge = (d: DiaNoLaborable) => (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-medium text-orange-700">
      {d.recurrente_anual ? <Repeat className="h-3 w-3" /> : null}
      {d.recurrente_anual ? "Cada año" : "Fecha exacta"}
    </span>
  );

  const estadoVacio = (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <CalendarDays className="h-12 w-12 text-gray-300" />
      <p className="mt-3 text-sm font-medium text-gray-700">Aún no hay días no laborables</p>
      <p className="mt-1 max-w-xs text-xs text-gray-500">
        Selecciona un día en el calendario para agregar el primero.
      </p>
      <button
        type="button"
        onClick={() => setVista("calendario")}
        className="mt-4 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
      >
        Ir al calendario
      </button>
    </div>
  );

  const renderLista = (titulo: string, items: DiaNoLaborable[]) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-4">
        <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
          {titulo}
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
            {items.length}
          </span>
        </h4>
        <div className="overflow-hidden rounded-xl border border-gray-200">
          {items.map((d, idx) => (
            <div
              key={d.id}
              className={`flex flex-col gap-2 p-3 sm:flex-row sm:items-center ${
                idx > 0 ? "border-t border-gray-100" : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">{d.descripcion || "Sin descripción"}</p>
                <p className="text-xs text-gray-500">{formatearFecha(d)}</p>
              </div>
              {badge(d)}
              <div className="self-end sm:self-auto">{botonEliminar(d)}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTarjetas = (titulo: string, items: DiaNoLaborable[]) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-5">
        <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
          {titulo}
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
            {items.length}
          </span>
        </h4>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((d) => {
            const f = parseFecha(d.fecha);
            return (
              <div key={d.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-orange-100 text-orange-700">
                    <span className="text-base font-bold leading-none">{f.getDate()}</span>
                    <span className="text-[10px] uppercase leading-none">
                      {MESES[f.getMonth()].slice(0, 3)}
                    </span>
                  </div>
                  {botonEliminar(d)}
                </div>
                <p className="mt-3 line-clamp-2 text-sm font-medium text-gray-900">
                  {d.descripcion || "Sin descripción"}
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-500">{formatearFecha(d)}</span>
                  {badge(d)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-0 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Días no laborables"
    >
      <div
        className="flex h-full w-full flex-col overflow-hidden bg-white shadow-xl sm:h-auto sm:max-h-[90vh] sm:max-w-3xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-gray-900">Días no laborables</h2>
              <p className="text-xs text-gray-500">
                {dias.length === 1 ? "1 día configurado" : `${dias.length} días configurados`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label="Cerrar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="shrink-0 px-4 pt-4 sm:px-6">
          <div className="inline-flex w-full rounded-lg bg-gray-100 p-1 sm:w-auto">
            {TABS.map(({ valor, label, Icono }) => (
              <button
                key={valor}
                type="button"
                onClick={() => setVista(valor)}
                className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition sm:flex-none ${
                  vista === valor
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <Icono className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {vista === "calendario" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 p-3 sm:p-4">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="order-first text-center text-sm font-semibold capitalize text-gray-900 sm:order-none sm:text-left sm:text-base">
                    {MESES[mes]} {anio}
                  </h3>
                  <div className="flex items-center justify-center gap-1 sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setMesVisible(new Date(anio, mes - 1, 1))}
                      className="rounded-lg p-2 text-gray-600 transition hover:bg-gray-100"
                      aria-label="Mes anterior"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setMesVisible(new Date(anio, mes + 1, 1))}
                      className="rounded-lg p-2 text-gray-600 transition hover:bg-gray-100"
                      aria-label="Mes siguiente"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={irHoy}
                      className="ml-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                    >
                      Hoy
                    </button>
                  </div>
                </div>

                <div className="mb-1 grid grid-cols-7 gap-1">
                  {DIAS_SEMANA.map((d) => (
                    <div
                      key={d}
                      className="py-1 text-center text-[11px] font-medium text-gray-400 sm:text-xs"
                    >
                      {d}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: totalCeldas }).map((_, i) => {
                    const numeroDia = i - offset + 1;
                    if (numeroDia < 1 || numeroDia > diasEnMes) {
                      return <div key={`vacio-${i}`} />;
                    }
                    const fecha = new Date(anio, mes, numeroDia);
                    const iso = toFechaStr(fecha);
                    const feriados = feriadosEn(fecha);
                    const tieneFeriado = feriados.length > 0;
                    const seleccionado = diaSeleccionado
                      ? toFechaStr(diaSeleccionado) === iso
                      : false;
                    const esHoy = toFechaStr(new Date()) === iso;
                    return (
                      <button
                        key={iso}
                        type="button"
                        onClick={() => seleccionarDia(fecha)}
                        title={
                          tieneFeriado
                            ? feriados
                                .map((f) => f.descripcion || formatearFecha(f))
                                .join(", ")
                            : "Agregar día no laborable"
                        }
                        className={`relative flex h-9 items-center justify-center rounded-lg text-xs transition sm:h-11 sm:text-sm ${
                          tieneFeriado
                            ? "bg-orange-100 font-semibold text-orange-800 hover:bg-orange-200"
                            : "text-gray-700 hover:bg-gray-100"
                        } ${seleccionado ? "ring-2 ring-orange-500 ring-offset-1" : ""} ${
                          esHoy && !tieneFeriado ? "border border-orange-300 font-semibold" : ""
                        }`}
                      >
                        {numeroDia}
                        {tieneFeriado && (
                          <span className="absolute bottom-1 h-1 w-1 rounded-full bg-orange-500" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <p className="mt-3 text-center text-[11px] text-gray-400 sm:text-xs">
                  Toca un día para agregar o eliminar un día no laborable.
                </p>
              </div>

              {/* Panel del día seleccionado */}
              {diaSeleccionado && (
                <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-3 sm:p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-600">
                        Día seleccionado
                      </p>
                      <p className="text-sm font-semibold capitalize text-gray-900">
                        {formatearFechaLarga(diaSeleccionado)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDiaSeleccionado(null)}
                      className="rounded-lg p-1 text-gray-400 transition hover:bg-white hover:text-gray-600"
                      aria-label="Quitar selección"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {feriadosSeleccionados.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-gray-600">Este día ya está configurado:</p>
                      {feriadosSeleccionados.map((d) => (
                        <div
                          key={d.id}
                          className="flex flex-col gap-2 rounded-lg bg-white p-2.5 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                              {d.descripcion || "Sin descripción"}
                            </p>
                            <span className="text-[11px] text-gray-500">
                              {d.recurrente_anual ? "Se repite cada año" : "Fecha exacta"}
                            </span>
                          </div>
                          {botonEliminar(d, true)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <form onSubmit={handleCrear} className="mt-3 space-y-3">
                      <div>
                        <label
                          htmlFor="dia-no-laborable-descripcion"
                          className="mb-1 block text-xs font-medium text-gray-700"
                        >
                          Descripción (opcional)
                        </label>
                        <input
                          id="dia-no-laborable-descripcion"
                          value={descripcion}
                          onChange={(e) => setDescripcion(e.target.value)}
                          placeholder="Ej. Carnaval"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={recurrente}
                          onChange={(e) => setRecurrente(e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        Se repite cada año
                      </label>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                          type="submit"
                          disabled={creando}
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Plus className="h-4 w-4" />
                          {creando ? "Guardando..." : "Agregar día no laborable"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDiaSeleccionado(null)}
                          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 transition hover:bg-white"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Feriados del mes visible */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-semibold capitalize text-gray-900">
                    Feriados de {MESES[mes]}
                  </h4>
                  <span className="text-xs text-gray-400">{feriadosDelMes.length}</span>
                </div>
                {feriadosDelMes.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-gray-200 py-4 text-center text-xs text-gray-400">
                    No hay días no laborables en este mes.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {feriadosDelMes.map((d) => {
                      const f = parseFecha(d.fecha);
                      return (
                        <div
                          key={d.id}
                          className="flex flex-col gap-2 rounded-lg bg-gray-50 p-2.5 sm:flex-row sm:items-center"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              const fecha = parseFecha(d.fecha);
                              if (d.recurrente_anual) fecha.setFullYear(anio);
                              seleccionarDia(fecha);
                              setMesVisible(new Date(fecha.getFullYear(), fecha.getMonth(), 1));
                            }}
                            className="flex min-w-0 flex-1 items-center gap-3 text-left"
                          >
                            <span className="flex h-9 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-orange-100 text-orange-700">
                              <span className="text-sm font-bold leading-none">{f.getDate()}</span>
                              <span className="text-[9px] uppercase leading-none">
                                {MESES[f.getMonth()].slice(0, 3)}
                              </span>
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-gray-900">
                                {d.descripcion || "Sin descripción"}
                              </span>
                              <span className="block text-[11px] text-gray-500">
                                {d.recurrente_anual ? "Cada año" : formatearFecha(d)}
                              </span>
                            </span>
                          </button>
                          {botonEliminar(d)}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {vista === "lista" &&
            (dias.length === 0 ? (
              estadoVacio
            ) : (
              <>
                {renderLista("Cada año", recurrentes)}
                {renderLista("Fechas exactas", exactos)}
              </>
            ))}

          {vista === "tarjetas" &&
            (dias.length === 0 ? (
              estadoVacio
            ) : (
              <>
                {renderTarjetas("Cada año", recurrentes)}
                {renderTarjetas("Fechas exactas", exactos)}
              </>
            ))}
        </div>
      </div>
    </div>
  );
};

export default DiasNoLaborablesModal;
