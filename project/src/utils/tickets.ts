
// Filtra tickets por estado, prioridad y término de búsqueda
export function filtrarTickets({
  tickets,
  filtroEstado,
  filtroPrioridad,
  terminoBusqueda,
  clientesMap,
}: {
  tickets: Ticket[];
  filtroEstado: string;
  filtroPrioridad: string;
  terminoBusqueda: string;
  clientesMap: (id: string) => { empresa?: string; nombre?: string } | undefined;
}) {
  if (!tickets) return [];
  const busquedaLower = terminoBusqueda.toLowerCase();
  return (Array.isArray(tickets) ? tickets : []).filter((ticket) => {
    const pasaFiltroEstado =
      filtroEstado === "todos" || ticket.estado === filtroEstado;
    const pasaFiltroPrioridad =
      filtroPrioridad === "todas" || ticket.prioridad === filtroPrioridad;
    const pasaFiltroBusqueda =
      terminoBusqueda.trim() === "" ||
      ticket.titulo.toLowerCase().includes(busquedaLower) ||
      (ticket.descripcion?.toLowerCase().includes(busquedaLower) ?? false) ||
      (clientesMap(ticket.cliente_id)?.empresa?.toLowerCase().includes(busquedaLower) ?? false) ||
      (clientesMap(ticket.cliente_id)?.nombre?.toLowerCase().includes(busquedaLower) ?? false);
    return pasaFiltroEstado && pasaFiltroPrioridad && pasaFiltroBusqueda;
  });
}

// Calcula estadísticas de tickets filtrados
export function calcularEstadisticasTickets(ticketsFiltrados: Ticket[]) {
  return {
    total: ticketsFiltrados.length,
    abiertos: ticketsFiltrados.filter((t) => t.estado === "abierto").length,
    resueltos: ticketsFiltrados.filter((t) => t.estado === "resuelto").length,
    urgentes: ticketsFiltrados.filter((t) => t.prioridad === "urgente").length,
  };
}
import { User } from "@supabase/supabase-js";
import { Ticket } from "../types";
import { UseMutateFunction } from "@tanstack/react-query";
import { toast } from "react-toastify";

export const utilsTikets = () => {
     const getEstadoColor = (estado: string) => {
    switch (estado) {
      case "abierto":
        return "bg-red-100 text-red-800";
      case "en_proceso":
        return "bg-yellow-100 text-yellow-800";
      case "resuelto":
        return "bg-green-100 text-green-800";
      case "cerrado":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case "urgente":
        return "bg-red-100 text-red-800 border-red-200";
      case "alta":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "media":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "baja":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getCategoriaColor = (categoria: string) => {
    switch (categoria) {
      case "tecnico":
        return "bg-blue-100 text-blue-800";
      case "facturacion":
        return "bg-purple-100 text-purple-800";
      case "producto":
        return "bg-indigo-100 text-indigo-800";
      case "servicio":
        return "bg-teal-100 text-teal-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return { getEstadoColor, getPrioridadColor, getCategoriaColor };
};

interface ActualizarTiketParams {
    data: Partial<Ticket>;
    currentUser: User;
    mutateTicket: UseMutateFunction<void, Error, { TicketData: Partial<Ticket>; currentUser: User }, unknown>;
  }

  export const actualizarTicketUtil = ({data, currentUser, mutateTicket}: ActualizarTiketParams) => {
    if (!currentUser) {
      toast.error("No estás logueado");
      return;
    }
    mutateTicket(
      {
        TicketData: data,
        currentUser,
      },
      {
        onSuccess: () => {
          toast.success("Ticket actualizado correctamente");
        },
        onError: (error) => {
          toast.error(error.message);
        },
      }
    );
  };

  interface CrearTicketParams {
    ticketData: Partial<Ticket>;
    currentUser: User;
    navigate: (path: string) => void;
    crearTicket: UseMutateFunction<void, Error, { ticketData: Partial<Ticket>; currentUser: User }, unknown>;
    setModalTicket: (v: boolean) => void;
  }

  export const creaandoTicketUtil = ({ticketData, currentUser, navigate, crearTicket, setModalTicket}: CrearTicketParams) => {
    if (!currentUser) {
      toast.error("Usuario no logueado");
        navigate("/login");
        return;
      }
  
      crearTicket(
        {
          ticketData,
          currentUser,
        },
        {
          onSuccess: () => {
            toast.success("Ticket creado con éxito");
            setModalTicket(false);
          },
          onError: (error) => {
            toast.error(error.message);
          },
        }
      );
    };

   