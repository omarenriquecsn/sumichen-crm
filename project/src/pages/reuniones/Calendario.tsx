import React, { useMemo, useState } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import moment from "moment";
import { useSupabase } from "../../hooks/useSupabase";
import { Reunion, ReunionCalendario } from "../../types";
import { ReunionesDetailModal } from "./ReunionesDetailModal"; // Ajusta la ruta si es necesario
import useVendedores from "../../hooks/useVendedores";

const localizer = momentLocalizer(moment);

const Calendario: React.FC = () => {
  const supabase = useSupabase();
  const { data: reuniones } = supabase.useReuniones();
  const { data: vendedores } = useVendedores();

  const [reunionSeleccionada, setReunionSeleccionada] =
    useState<ReunionCalendario | null>(null);

  const eventos = useMemo(() => {
    if (!reuniones) return [];
    return (reuniones as ReunionCalendario[]).map((reunion) => ({
      id: Number(reunion.id),
      title: reunion.titulo || "Reunión",
      start: new Date(reunion.fecha_inicio),
      end: new Date(reunion.fecha_fin),
      allDay: false,
      resource: reunion,
      fecha_creacion: reunion.fecha_creacion,
      fecha_actualizacion: reunion.fecha_actualizacion,
    }));
  }, [reuniones]);

  // Maneja el click en un evento
  type CalendarEvent = {
    id: number;
    title: string;
    start: Date;
    end: Date;
    allDay: boolean;
    resource: Reunion;
    fecha_creacion: string;
    fecha_actualizacion: string;
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    setReunionSeleccionada({
      ...event.resource,
      fecha_creacion: event.fecha_creacion,
      fecha_actualizacion: event.fecha_actualizacion,
    });
  };

  const handleCloseModal = () => {
    setReunionSeleccionada(null);
  };

  const vendedor = Array.isArray(vendedores)
    ? vendedores.find(
        (vendedor) => vendedor.id === reunionSeleccionada?.vendedor_id
      )
    : null;
  return (
    <div className="h-[55vh] w-full flex justify-center">
      <Calendar
        localizer={localizer}
        events={eventos}
        startAccessor="start"
        endAccessor="end"
        titleAccessor="title"
        style={{ height: "100%" }}
        popup
        views={["month", "week", "day", "agenda"]}
        messages={{
          next: "Sig.",
          previous: "Ant.",
          today: "Hoy",
          month: "Mes",
          week: "Semana",
          day: "Día",
          agenda: "Agenda",
        }}
        onSelectEvent={handleSelectEvent}
      />
      {reunionSeleccionada && (
        <ReunionesDetailModal
          vendedor={vendedor}
          reunion={reunionSeleccionada}
          isOpen={!!reunionSeleccionada}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default Calendario;
