import React, { useMemo, useState } from "react";
import {
  Calendar,
  momentLocalizer,
  SlotInfo,
  ToolbarProps,
  EventProps,
  View,
  DateFormatFunction,
  DateRangeFormatFunction,
} from "react-big-calendar";
import withDragAndDrop, {
  EventInteractionArgs,
} from "react-big-calendar/lib/addons/dragAndDrop";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./calendario.css";
import moment from "moment";
import "moment/locale/es";
import { toast } from "react-toastify";
import {
  Video,
  Phone,
  Users,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useSupabase } from "../../hooks/useSupabase";
import { ReunionCalendario } from "../../types";
import { ReunionesDetailModal } from "./ReunionesDetailModal";
import useVendedores from "../../hooks/useVendedores";
import { useAuth } from "../../context/useAuth";

const localizer = momentLocalizer(moment);
moment.locale("es");

const DnDCalendar = withDragAndDrop(Calendar);

interface CalendarioProps {
  /** Acota las reuniones al vendedor indicado (id de tabla vendedores). */
  vendedorId?: string;
  /** Se dispara al hacer clic en un día/hora vacío del calendario. */
  onSlotSelect?: (start: Date) => void;
  /** Permite abrir el modal de edición (para reprogramar) desde el detalle. */
  onEditarReunion?: (reunion: ReunionCalendario) => void;
}

interface CalendarioEvento {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resource: ReunionCalendario;
}

const ETIQUETAS_VISTAS: Record<string, string> = {
  month: "Mes",
  week: "Semana",
  day: "Día",
  agenda: "Agenda",
};

const getTipoIcon = (tipo: string) => {
  switch (tipo) {
    case "virtual":
      return <Video className="h-3.5 w-3.5" />;
    case "telefonica":
      return <Phone className="h-3.5 w-3.5" />;
    case "presencial":
      return <Users className="h-3.5 w-3.5" />;
    default:
      return <CalendarIcon className="h-3.5 w-3.5" />;
  }
};

const chipPorEstado = (estado: string) => {
  switch (estado) {
    case "completada":
      return "chip-completada";
    case "cancelada":
      return "chip-cancelada";
    default:
      return "chip-programada";
  }
};

/** Detección de dispositivos táctiles (el drag HTML5 solo funciona con mouse). */
const esDispositivoTactil = () => {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(pointer: coarse)").matches ||
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0
  );
};

const ToolbarCalendario = ({
  label,
  view,
  views,
  onNavigate,
  onView,
}: ToolbarProps<CalendarioEvento>) => {
  const claves = (Array.isArray(views) ? views : Object.keys(views)) as View[];
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onNavigate("PREV")}
          aria-label="Anterior"
          className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onNavigate("TODAY")}
          className="px-3 py-1.5 rounded-lg text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
        >
          Hoy
        </button>
        <button
          type="button"
          onClick={() => onNavigate("NEXT")}
          aria-label="Siguiente"
          className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <h3 className="text-base font-semibold text-gray-800 capitalize">
        {label}
      </h3>

      <div className="flex bg-gray-100 rounded-lg p-1">
        {claves.map((clave) => (
          <button
            key={clave}
            type="button"
            onClick={() => onView(clave)}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              view === clave
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {ETIQUETAS_VISTAS[clave] ?? clave}
          </button>
        ))}
      </div>
    </div>
  );
};

const EventoCalendario = ({ event, title }: EventProps<CalendarioEvento>) => {
  const reunion = (event as CalendarioEvento).resource;
  return (
    <div className="flex items-center gap-1.5 w-full h-full min-h-[20px] px-1.5 overflow-hidden">
      <span className="shrink-0">{getTipoIcon(reunion.tipo)}</span>
      <span className="shrink-0 text-[0.7rem] font-semibold tabular-nums">
        {moment(event.start).format("HH:mm")}
      </span>
      <span className="truncate text-xs font-medium">{title}</span>
    </div>
  );
};

const Calendario: React.FC<CalendarioProps> = ({
  vendedorId,
  onSlotSelect,
  onEditarReunion,
}) => {
  const supabase = useSupabase();
  const { currentUser } = useAuth();
  const { data: vendedores } = useVendedores();

  const esTactil = useMemo(esDispositivoTactil, []);

  const [reunionSeleccionada, setReunionSeleccionada] =
    useState<ReunionCalendario | null>(null);
  const [filtroEstado, setFiltroEstado] = useState("todas");
  const [filtroTipo, setFiltroTipo] = useState("todos");

  const { mutate: actualizarReunion } = supabase.useActualizarReunion();

  const { data: reuniones, isLoading } = supabase.useReuniones(vendedorId);

  const eventos = useMemo(() => {
    const lista = (Array.isArray(reuniones) ? reuniones : []).filter(
      (reunion) => {
        if (vendedorId && reunion.vendedor_id !== vendedorId) return false;
        if (filtroEstado !== "todas" && reunion.estado !== filtroEstado)
          return false;
        if (filtroTipo !== "todos" && reunion.tipo !== filtroTipo) return false;
        return true;
      }
    );
    return lista.map<CalendarioEvento>((reunion) => ({
      id: reunion.id,
      title: reunion.titulo || "Reunión",
      start: new Date(reunion.fecha_inicio),
      end: new Date(reunion.fecha_fin),
      allDay: false,
      resource: reunion,
    }));
  }, [reuniones, vendedorId, filtroEstado, filtroTipo]);

  const formats = useMemo(() => {
    const fecha = (f: string): DateFormatFunction => (d: Date) =>
      moment(d).format(f);
    const rango = (fIni: string, fFin: string): DateRangeFormatFunction => (
      range: { start: Date; end: Date }
    ) => `${moment(range.start).format(fIni)} — ${moment(range.end).format(fFin)}`;
    return {
      dateFormat: fecha("D"),
      dayFormat: fecha("dddd D"),
      weekdayFormat: fecha("ddd"),
      monthHeaderFormat: fecha("MMMM YYYY"),
      dayHeaderFormat: fecha("dddd D MMMM"),
      timeGutterFormat: fecha("HH:mm"),
      dayRangeHeaderFormat: rango("D MMMM", "D MMMM YYYY"),
      agendaHeaderFormat: rango("D MMMM YYYY", "D MMMM YYYY"),
      agendaDateFormat: fecha("ddd D"),
      agendaTimeFormat: fecha("HH:mm"),
    };
  }, []);

  const handleSelectEvent = (event: CalendarioEvento) => {
    setReunionSeleccionada(event.resource);
  };

  const handleCloseModal = () => {
    setReunionSeleccionada(null);
  };

  const handleEditarReunion = (reunion: ReunionCalendario) => {
    setReunionSeleccionada(null);
    onEditarReunion?.(reunion);
  };

  const handleSelectSlot = (slotInfo: SlotInfo) => {
    if (onSlotSelect) onSlotSelect(new Date(slotInfo.start));
  };

  const reprogramarReunion = ({
    event,
    start,
    end,
  }: EventInteractionArgs<CalendarioEvento>) => {
    if (!currentUser) {
      toast.error("Debes iniciar sesión para reprogramar");
      return;
    }
    const reunion = event.resource;
    actualizarReunion(
      {
        ReunionData: {
          id: reunion.id,
          fecha_inicio: new Date(start),
          fecha_fin: new Date(end),
        },
        currentUser,
      },
      {
        onSuccess: () => toast.success("Reunión reprogramada"),
        onError: () => toast.error("Error al reprogramar la reunión"),
      }
    );
  };

  const vendedor = Array.isArray(vendedores)
    ? vendedores.find((v) => v.id === reunionSeleccionada?.vendedor_id)
    : null;

  return (
    <div className="w-full">
      {/* Leyenda + filtros */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-600">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            Programada
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
            Completada
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            Cancelada
          </span>
          <span className="text-gray-400 hidden md:inline">•</span>
          <span className="text-gray-400">
            {esTactil
              ? "Toca un evento para ver o reprogramar."
              : "Arrastra un evento para reprogramar."}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="todas">Todos los estados</option>
            <option value="programada">Programadas</option>
            <option value="completada">Completadas</option>
            <option value="cancelada">Canceladas</option>
          </select>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="todos">Todos los tipos</option>
            <option value="presencial">Presencial</option>
            <option value="virtual">Virtual</option>
            <option value="telefonica">Telefónica</option>
          </select>
        </div>
      </div>

      {/* Calendario */}
      <div className="h-[55vh] sm:h-[62vh] lg:h-[66vh] w-full">
        {isLoading && eventos.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-gray-400 flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
              Cargando reuniones...
            </div>
          </div>
        ) : (
          <DnDCalendar
            localizer={localizer}
            events={eventos}
            culture="es"
            formats={formats}
            startAccessor="start"
            endAccessor="end"
            titleAccessor="title"
            style={{ height: "100%" }}
            defaultView="month"
            views={["month", "week", "day", "agenda"]}
            messages={{
              next: "Sig.",
              previous: "Ant.",
              today: "Hoy",
              month: "Mes",
              week: "Semana",
              day: "Día",
              agenda: "Agenda",
              noEventsInRange: "No hay reuniones en este período",
            }}
            components={{
              toolbar: ToolbarCalendario,
              event: EventoCalendario,
            }}
            eventPropGetter={(event) => ({
              className: chipPorEstado(
                (event as CalendarioEvento).resource.estado
              ),
            })}
            popup
            selectable="ignoreEvents"
            longPressThreshold={30}
            min={new Date(2000, 0, 1, 7, 0, 0)}
            max={new Date(2000, 0, 1, 20, 0, 0)}
            draggableAccessor={(event) =>
              !esTactil &&
              (event as CalendarioEvento).resource.estado !== "cancelada"
            }
            resizableAccessor={(event) =>
              !esTactil &&
              (event as CalendarioEvento).resource.estado !== "cancelada"
            }
            resizable={!esTactil}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            onEventDrop={reprogramarReunion}
            onEventResize={reprogramarReunion}
          />
        )}
      </div>

      {!isLoading && eventos.length === 0 && (
        <p className="text-center text-sm text-gray-400 mt-3">
          No hay reuniones que mostrar con los filtros actuales.
        </p>
      )}

      {reunionSeleccionada && (
        <ReunionesDetailModal
          vendedor={vendedor}
          reunion={reunionSeleccionada}
          isOpen={!!reunionSeleccionada}
          onClose={handleCloseModal}
          onEditar={
            onEditarReunion ? handleEditarReunion : undefined
          }
        />
      )}
    </div>
  );
};

export default Calendario;
