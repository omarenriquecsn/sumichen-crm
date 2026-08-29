import React, { useState, useCallback } from "react";
import { Layout } from "../../components/layout/Layout";
import {
  Plus,
  Search,
  Filter,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  User,
  Calendar,
  MessageSquare,
} from "lucide-react";
import { useSupabase } from "../../hooks/useSupabase";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { ConfirmarAccionToast } from "../../components/ui/ConfirmarAccionToast";
import { Cliente, Ticket } from "../../types";
import CrearTicket from "../../components/forms/CrearTicket";
import Modal from "../../components/ui/Modal";
import Select from "react-select";
import {
  actualizarTicketUtil,
  creaandoTicketUtil,
  utilsTikets,
  filtrarTickets,
  calcularEstadisticasTickets,
} from "../../utils/tickets";

type TicketsProps = {
  ticketsProp?: Ticket[];
  clientesProp?: Cliente[];
};

export const Tickets: React.FC<TicketsProps> = ({ ticketsProp, clientesProp }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const supabase = useSupabase();

  const { getEstadoColor, getPrioridadColor, getCategoriaColor } =
    utilsTikets();
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroPrioridad, setFiltroPrioridad] = useState("todas");
  const [terminoBusqueda, setTerminoBusqueda] = useState("");
  const [mostrarToast, setMostrarToast] = useState(false);
  const [ticketIdSeleccionada, setReunionIdSeleccionada] = useState<
    string | null
  >(null);
  const [modalTicket, setModalTicket] = useState(false);
  const [cliente_id, setCliente_id] = useState<string>("");
  const [modalClienteVisible, setModalClienteVisible] = useState(false);

  // tickets
  const { data: ticketsDb } = supabase.useTickets();

  // clientes
  const { data: clientesDb } = supabase.useClientes();

  // Actualizar Ticket

  const tickets = ticketsProp ?? ticketsDb ?? [];
  
  const clientes = React.useMemo(
    () => clientesProp ?? clientesDb ?? [],
    [clientesProp, clientesDb]
  );

  const { mutate: mutateTicket } = supabase.useActualizarTicket();

  // Crear ticket

  const { mutate: crearTicket, isPending: pendingCrearReunion } =
    supabase.useCrearTicket();

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case "abierto":
        return <AlertCircle className="h-4 w-4" />;
      case "en_proceso":
        return <Clock className="h-4 w-4" />;
      case "resuelto":
        return <CheckCircle className="h-4 w-4" />;
      case "cerrado":
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const clientesMap = useCallback(
    (id: string) => {
      const cliente = clientes?.find((c) => c.id === id);
      return cliente;
    },
    [clientes]
  );

  const actualizarTicket = (data: Partial<Ticket>) => {
    if (!currentUser) {
      toast.error("No estas logueado");
      navigate("/login");
      return;
    }
    actualizarTicketUtil({ data, currentUser, mutateTicket });
  };

  const creaandoTicket = (ticketData: Partial<Ticket>) => {
    if (!currentUser) {
      toast.error("No estas logueado");
      navigate("/login");
      return;
    }
    creaandoTicketUtil({
      ticketData,
      currentUser,
      navigate,
      crearTicket,
      setModalTicket,
    });
  };

  // Filtrado y estadísticas usando utils
  const ticketsFiltrados = filtrarTickets({
    tickets: tickets ?? [],
    filtroEstado,
    filtroPrioridad,
    terminoBusqueda,
    clientesMap,
  });

  const estadisticas = calcularEstadisticasTickets(ticketsFiltrados);

  const prepararCancelacion = (reunion_id: string) => {
    setReunionIdSeleccionada(reunion_id);
    setMostrarToast(true); // Aquí solo se lanza el toast
  };

  const confirmarCancelacion = () => {
    if (!ticketIdSeleccionada) return;

    const tiket = tickets?.find((t) => t.id === ticketIdSeleccionada);
    actualizarTicket({
      titulo: tiket?.titulo,
      descripcion: tiket?.descripcion,
      vendedor_id: currentUser?.id,
      cliente_id: tiket?.cliente_id,
      id: ticketIdSeleccionada,
      estado: "resuelto",
      fecha_actualizacion: new Date(),
    });

    setMostrarToast(false);
    setReunionIdSeleccionada(null);
  };

  return (
    <Layout
      title="Tickets de Soporte"
      subtitle="Gestiona las solicitudes y problemas de tus clientes"
    >
      <div className="space-y-6">
        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-100">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-600">Total</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {estadisticas.total}
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-100">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-sm font-medium text-gray-600">
                Abiertos
              </span>
            </div>
            <p className="text-2xl font-bold text-red-600 mt-2">
              {estadisticas.abiertos}
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-100">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-gray-600">
                Resueltos
              </span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-2">
              {estadisticas.resueltos}
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-100">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-sm font-medium text-gray-600">
                Urgentes
              </span>
            </div>
            <p className="text-2xl font-bold text-red-600 mt-2">
              {estadisticas.urgentes}
            </p>
          </div>
        </div>

        {/* Barra de herramientas */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            {/* Búsqueda */}
            <div className="relative">
              <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar tickets..."
                value={terminoBusqueda}
                onChange={(e) => setTerminoBusqueda(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
              />
            </div>

            {/* Filtros */}

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0 sm:space-x-2">
              <Filter className="h-5 w-5 text-gray-400 hidden sm:inline" />
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="w-full sm:w-auto sm:min-w-0 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="todos">Todos los estados</option>
                <option value="abierto">Abiertos</option>
                <option value="resuelto">Resueltos</option>
              </select>

              <select
                value={filtroPrioridad}
                onChange={(e) => setFiltroPrioridad(e.target.value)}
                className="w-full sm:w-auto sm:min-w-0 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="todas">Todas las prioridades</option>
                <option value="urgente">Urgente</option>
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
            </div>
          </div>

          {/* Botón nuevo ticket */}
          <button
            onClick={() => setModalClienteVisible(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Nuevo Ticket</span>
          </button>
        </div>

        {/* Lista de tickets */}
        {ticketsFiltrados ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-4 px-6 font-medium text-gray-900">
                      Ticket
                    </th>
                    <th className="text-left py-4 px-6 font-medium text-gray-900">
                      Cliente
                    </th>
                    <th className="text-left py-4 px-6 font-medium text-gray-900">
                      Estado
                    </th>
                    <th className="text-left py-4 px-6 font-medium text-gray-900">
                      Prioridad
                    </th>
                    <th className="text-left py-4 px-6 font-medium text-gray-900">
                      Categoría
                    </th>
                    <th className="text-left py-4 px-6 font-medium text-gray-900">
                      Fecha
                    </th>
                    <th className="text-left py-4 px-6 font-medium text-gray-900">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {ticketsFiltrados.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-gray-50">
                      <td className="py-4 px-6">
                        <div className="flex items-start space-x-3">
                          <div
                            className={`p-2 rounded-lg ${getEstadoColor(
                              ticket.estado
                            )}`}
                          >
                            {getEstadoIcon(ticket.estado)}
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {ticket.titulo}
                            </h4>
                            <p className="text-sm text-gray-500 mt-1 max-w-md">
                              {ticket.descripcion}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900">
                              {clientesMap(ticket.cliente_id)?.empresa ??
                                "Cliente"}{" "}
                            </p>
                            <p className="text-sm text-gray-500">
                              {clientesMap(ticket.cliente_id)?.email}{" "}
                              {clientesMap(ticket.cliente_id)?.telefono}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getEstadoColor(
                            ticket.estado
                          )}`}
                        >
                          {ticket.estado.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${getPrioridadColor(
                            ticket.prioridad
                          )}`}
                        >
                          {ticket.prioridad}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getCategoriaColor(
                            ticket.categoria
                          )}`}
                        >
                          {ticket.categoria}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-900">
                              {dayjs(ticket.fecha_actualizacion).format(
                                "DD/MM/YYYY"
                              )}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            Actualizado:{" "}
                            {dayjs(ticket.fecha_actualizacion).format(
                              "DD/MM/YYYY"
                            )}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => navigate(`/tickets/${ticket.id}`)}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            Ver
                          </button>
                          {ticket.estado !== "resuelto" &&
                            ticket.estado !== "cerrado" && (
                              <button
                                onClick={() => prepararCancelacion(ticket.id)}
                                className="text-green-600 hover:text-green-700 text-sm font-medium"
                              >
                                Resolver
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex justify-center  h-screen mt-96">
            <div>
              <p>No hay tickets</p>
            </div>
          </div>
        )}
      </div>
      <ConfirmarAccionToast
        visible={mostrarToast}
        setVisible={setMostrarToast}
        onConfirm={confirmarCancelacion}
        texto="¿Estás seguro de que deseas Resolver este Ticket?"
        posicion="bottom-right"
        tema="dark"
        modoModal={true}
      />
      <Modal
        isOpen={modalTicket}
        onClose={() => {
          setModalTicket(false);
        }}
      >
        <CrearTicket
          onSubmit={creaandoTicket}
          accion={!pendingCrearReunion ? "Crear Ticket" : "Creando..."}
          cliente_id={cliente_id}
          estado="abierto"
        />
      </Modal>

      <Modal
        isOpen={modalClienteVisible}
        onClose={() => setModalClienteVisible(false)}
      >
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">
            Selecciona un cliente
          </h3>
          <Select
            options={Array.isArray(clientes) ? clientes.map((c) => ({
              value: c.id,
              label: c.empresa,
            })) : []}
            onChange={(opcion) => setCliente_id(opcion?.value ?? "")}
            placeholder="Selecciona un cliente"
            isSearchable
            menuPortalTarget={document.body}
            styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
          />
          <button
            disabled={!cliente_id}
            onClick={() => {
              setModalClienteVisible(false);
              setModalTicket(true);
            }}
            className="bg-green-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
          >
            Continuar
          </button>
        </div>
      </Modal>
    </Layout>
  );
};
