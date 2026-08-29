import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Layout } from "../../components/layout/Layout";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Edit,
  Plus,
  MessageSquare,
  FileText,
  Clock,
  IdCard,
  User2,
  Check,
  Trash,
  PencilLineIcon,
} from "lucide-react";
import {
  Actividad,
  Cliente,
  ClienteFormData,
  CustomerSector,
  IFormReunion,
  Pedido,
  PedidoData,
} from "../../types";
import Modal from "../../components/ui/Modal";
import ClienteForm from "../../components/forms/ClienteFom";
import { useAuth } from "../../context/useAuth";
import { useSupabase } from "../../hooks/useSupabase";
import { toast } from "react-toastify";
import CrearActividad from "../../components/forms/CrearActividad";
import { isMobile } from "react-device-detect";
import CrearReunion from "../../components/forms/CrearReunion";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { handleCrearPedidoUtil, utilsPedidos } from "../../utils/pedidos";
import CrearPedido from "../../components/forms/CrearPedido";
import { getEstadoColor, getEtapaColor } from "../../utils/clientes";
import { handleCrearActividadUtil } from "../../utils/actividades";
import { handleCrearReunionUtil } from "../../utils/reuniones";
import SelectVendedor from "../../components/ui/SelectVendedor";
import generarGoogleCalendarLink from "../../utils/googleCalendarLink";
import { ConfirmarAccionToast } from "../../components/ui/ConfirmarAccionToast";
import { useCrearNotificacion } from "../../hooks/useNotificaciones";
import useVendedores from "../../hooks/useVendedores";
import ActualizarActividadModal from "../../components/forms/ActualizarActividad";
import { AccionesRapidasCliente } from "../../components/ui/AccionesRapidasCliente";

export const ClienteDetalle: React.FC = () => {
  dayjs.locale("es");

  const { currentUser, session } = useAuth();
  const supabase = useSupabase();
  const URL = import.meta.env.VITE_BACKEND_URL;
  const { id } = useParams<{ id: string }>();

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isModalActualizarOpen, setModalActualizarOpen] = useState(false);
  const [isModalOpen, setModalOpen] = useState(false);
  const [isModalBOpen, setModalBOpen] = useState(false);
  const [isModalCOpen, setModalCopen] = useState(false);
  const [modalPedidoVisible, setModalPedidoVisible] = useState(false);
  const [modalVendedorVisible, setModalVendedorVisible] = useState(false);
  const [mostrarToastInvitacion, setMostrarToastInvitacion] = useState(false);
  const [handlers, setHandlers] = useState<{
    handleConfirm: () => void;
    handleCancel: () => void;
    texto: string;
  } | null>(null);
  const [handlersEliminar, setHandlersEliminar] = useState<{
    handleConfirm: () => void;
    handleCancel: () => void;
    texto: string;
  } | null>(null);
  const [mostrarToastEliminar, setMostrarToastEliminar] = useState(false);
  const [actividadSeleccionada, setActividadSeleccionada] =
    useState<Actividad | null>(null);

  // Actividades
  const { data: actividadesTodas, error: errorActividades } =
    supabase.useActividades();

  const { mutate: crearActividad, isPending: pendingActividad } =
    supabase.useCrearActividad();

  const { mutate: actualizarActividad } = supabase.useActualizarActividad();

  const { mutate: eliminarActividad } = supabase.useEliminarActividad();
  // Clientes
  const { data: clientes } = supabase.useClientes();
  const { mutate: editarCliente, isPending: pendigEditar } =
    supabase.useActualizarCliente();

  // Pedidos
  const { data: pedidos } = supabase.usePedidos();
  const { mutate: nuevoPedido, isPending: isPendingPedido } =
    supabase.useCrearPedido();

  // Reuniones
  const { mutate: crearReunion, isPending: pendingReunion } =
    supabase.useCrearReunion();

  // Oportunidades
  const { mutate: editarOportunidad } = supabase.useActualizarOportunidad();
  const { data: oportunidades } = supabase.useOportunidades();
  const { mutate: crearNotificacion } = useCrearNotificacion();

  // Vendedores
  const { data: vendedoresDb } = useVendedores();

  if (!currentUser) {
    toast.error("Debes iniciar sesión para ver los pedidos");
    navigate("/login");
    return;
  }
  const handleEditCliente = () => {
    setModalOpen(true);
  };

  if (clientes) {
    // Cliente filtrado

    const cliente = (Array.isArray(clientes) ? clientes : []).find(
      (c) => c.id === id,
    );
    const actividades = (
      Array.isArray(actividadesTodas) ? actividadesTodas : []
    ).filter((a) => a.cliente_id === id);

    if (!cliente) {
      toast.error("Cliente no encontrado");
      navigate("/clientes");
      return;
    }

    // Pedidos filtrados Ultima Compra Abrir Gmail

    const { pedidosFiltrados, ultimaCompra, abrirGmail } = utilsPedidos(
      pedidos as Pedido[],
      cliente,
    );

    // Completando actividad
    const completarActividad = (actividad: Actividad) => {
      if (!currentUser) return;

      actualizarActividad({
        ...actividad,
        completado: true,
      });
      toast.success("Actividad completada");
    };

    const actualizarActividadFn = (actividad: Actividad) => {
      setActividadSeleccionada(actividad);
      setModalActualizarOpen(true);
    };
    // Eliminar actividad
    const eliminarActividadFn = (actividad: Actividad) => {
      if (!currentUser) return;

      eliminarActividad(actividad);
      toast.success("Actividad eliminada");
    };

    // Eliminar cliente definitivamente
    const eliminarDefinitivamente = async () => {
      if (!session?.access_token) return;
      const res = await fetch(`${URL}/clientes/${cliente.id}/definitivo`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
        credentials: "include",
      });
      if (!res.ok) {
        toast.error("Error al eliminar el cliente definitivamente");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      toast.success("Cliente eliminado definitivamente");
      navigate("/clientes");
    };

    const handleEliminarDefinitivamente = () => {
      setHandlersEliminar({
        handleConfirm: () => {
          setMostrarToastEliminar(false);
          eliminarDefinitivamente();
        },
        handleCancel: () => setMostrarToastEliminar(false),
        texto: `¿Eliminar definitivamente a ${cliente.nombre} ${cliente.apellido}? Esta acción no se puede deshacer.`,
      });
      setMostrarToastEliminar(true);
    };

    // Handlers
    // Handle Update Cliente
    const handleUpdateCliente = async (data: ClienteFormData) => {
      if (!currentUser) return;

      if (!cliente) {
        throw new Error("Cliente no encontrado");
      }
      const clienteData: Cliente = {
        ...cliente,
        ...data,
        estado: data.estado as Cliente["estado"],
        etapa_venta: data.etapa_venta as Cliente["etapa_venta"],
        sector: data.sector as CustomerSector
      };

      const oportunidad =
        Array.isArray(oportunidades) &&
        oportunidades?.find((o) => o.cliente_id === cliente.id);

      if (oportunidad) {
        await editarOportunidad({
          OportunidadData: {
            ...oportunidad,
            etapa: clienteData.etapa_venta as
              | "inicial"
              | "calificado"
              | "propuesta"
              | "negociacion"
              | "cerrado",
          },
          currentUser,
        });
      }

      editarCliente(
        {
          clienteData,
          currentUser,
        },
        {
          onSuccess: () => {
            toast.success("Usuario Editado");
            setModalOpen(false);
          },
          onError: (error: unknown) => {
            if (error instanceof Error) {
              toast.error("Error al editar cliente");
            }
          },
        },
      );
    };

    //Handle para asignar vendedor

    // Handle Crear Actividad
    const handleCrearActividad = async (data: Partial<Actividad>) => {
      handleCrearActividadUtil({
        data,
        currentUser: {
          ...currentUser,
          rol: currentUser.rol as "vendedor" | "admin" | undefined,
        },
        navigate,
        crearActividad,
        setModalBOpen,
      });
    };

    // Handle Crear Reunion
    const handleCrearReunion = async (data: IFormReunion) => {
      // Espera la respuesta del usuario
      const confirmed = await new Promise<boolean>((resolve) => {
        const handleConfirm = () => {
          setMostrarToastInvitacion(false);
          resolve(true);
        };
        const handleCancel = () => {
          setMostrarToastInvitacion(false);
          resolve(false);
        };
        setHandlers({
          handleConfirm,
          handleCancel,
          texto: "¿Deseas invitar al cliente a la reunión en Google Calendar?",
        });
        setMostrarToastInvitacion(true);
      });

      // El flujo siempre continúa, solo cambia si hay invitado
      let elInvitado = null;
      if (confirmed) {
        elInvitado = cliente.email;
      }

      const fechaFormateada = dayjs(data.fecha).format("YYYY-MM-DD");
      const fechaInicio = `${fechaFormateada}T${data.inicio}:00`;
      const fechaFin = `${fechaFormateada}T${data.fin}:00`;

      const link = generarGoogleCalendarLink({
        titulo: data.titulo,
        descripcion: data.descripcion,
        ubicacion: data.ubicacion,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        invitados: elInvitado ? [elInvitado] : [],
      });
      window.open(link, "_blank");

      handleCrearReunionUtil({
        data,
        currentUser,
        navigate,
        crearReunion,
        setModalCopen,
      });
    };

    // Handle Crear Pedido

    const handleCrearPedido = (data: PedidoData) => {
      handleCrearPedidoUtil({
        data,
        currentUser,
        clienteSeleccionado: cliente.id,
        nuevoPedido,
        setModalPedidoVisible,
      });
      // Notificación al admin "Mayerlin Flores" y al vendedor asignado al cliente
      const elVendedor = Array.isArray(vendedoresDb)
        ? vendedoresDb.find((v) => v.id === cliente.vendedor_id)
        : null;
      crearNotificacion({
        vendedor_id: "425dd7b1-faef-40d2-9121-1febed7712b6",
        tipo: "aprobado",
        descripcion: `${
          elVendedor?.nombre || "Un vendedor"
        } ha creado un nuevo pedido.`,
      });
    };

    // Función para obtener el icono según el tipo de actividad
    const getTipoIcon = (tipo: string) => {
      switch (tipo) {
        case "reunion":
          return <Calendar className="h-4 w-4" />;
        case "llamada":
          return <Phone className="h-4 w-4" />;
        case "email":
          return <Mail className="h-4 w-4" />;
        case "tarea":
          return <FileText className="h-4 w-4" />;
        default:
          return <MessageSquare className="h-4 w-4" />;
      }
    };

    return (
      <Layout
        title={`${cliente?.nombre} ${cliente?.apellido}`}
        subtitle={`${cliente?.empresa}`}
      >
        <div className="space-y-6">
          {/* Navegación */}
          <div className="flex items-center space-x-4">
            <Link
              to="/clientes"
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Volver a Clientes</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Información principal */}
            <div className="lg:col-span-2 space-y-6">
              {/* Datos del cliente */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-bold text-xl">
                        {cliente.empresa
                          ? cliente.empresa[0].toUpperCase()
                          : "E"}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        {cliente?.empresa}
                      </h2>

                      <div className="flex items-center space-x-3 mt-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getEstadoColor(
                            cliente?.estado ? cliente.estado : "inactivo",
                          )}`}
                        >
                          {cliente?.estado}
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getEtapaColor(
                            cliente?.etapa_venta
                              ? cliente.etapa_venta
                              : "inicial",
                          )}`}
                        >
                          {cliente?.etapa_venta}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleEditCliente()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <Edit className="h-4 w-4" />
                    <span>Editar</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Mail className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium text-gray-900">
                          {cliente?.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Phone className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Teléfono</p>
                        <p className="font-medium text-gray-900">
                          {cliente?.telefono}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <User2 className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Contacto</p>
                        <p className="font-medium text-gray-900">
                          {cliente?.nombre} {cliente?.apellido}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <MapPin className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">
                          Dirección de Entrega
                        </p>
                        <p className="font-medium text-gray-900">
                          {cliente?.direccion_entrega}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <MapPin className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Dirección</p>
                        <p className="font-medium text-gray-900">
                          {cliente?.direccion}
                        </p>
                        <p className="text-sm text-gray-500">
                          {cliente?.ciudad}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <IdCard className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Rif de Empresa</p>
                        <p className="font-medium text-gray-900">
                          {cliente?.rif}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <MapPin className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Sector</p>
                        <p className="font-medium text-gray-900">
                          {cliente?.sector || "No especificado"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Calendar className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Cliente desde</p>
                        <p className="font-medium text-gray-900">
                          {cliente?.fecha_creacion
                            .toLocaleString()
                            .slice(0, 10)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <MapPin className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Google Maps</p>
                        <p className="font-medium text-gray-900">
                          <a
                            className="text-blue-600 hover:text-orange-500"
                            href={cliente?.google_maps}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {cliente?.google_maps ? "Mapa" : "Sin Mapa"}
                          </a>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {cliente?.notas && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-2">Notas</h4>
                    <p className="text-gray-600">{cliente.notas}</p>
                  </div>
                )}
              </div>

              {/* Actividades */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Actividades
                  </h3>
                  <button
                    onClick={() => setModalBOpen(true)}
                    className={`bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 ${
                      isMobile ? "mobile-button" : ""
                    }`}
                  >
                    <Plus
                      className={`h-4 w-4 ${isMobile ? "mobile-plus" : ""}`}
                    />
                    {!isMobile && <span>Nueva Actividad</span>}
                  </button>
                </div>

                <div className="space-y-4">
                  <>
                    {errorActividades ? (
                      <p>Error al cargar las actividades</p>
                    ) : actividades && actividades.length > 0 ? (
                      actividades.map((actividad) => (
                        <div
                          key={actividad.id}
                          className="flex items-start space-x-4 p-4 hover:bg-gray-50 rounded-lg"
                        >
                          <div
                            className={`p-2 rounded-full ${
                              actividad.completado
                                ? "bg-green-100"
                                : "bg-blue-100"
                            }`}
                          >
                            <div
                              className={`${
                                actividad.completado
                                  ? "text-green-600"
                                  : "text-blue-600"
                              }`}
                            >
                              {getTipoIcon(actividad.tipo)}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-gray-900">
                                {actividad.titulo}
                              </h4>
                              <div className="flex items-center space-x-2 text-sm text-gray-500">
                                <Clock className="h-4 w-4" />
                                <span>
                                  {actividad.fecha
                                    .toLocaleString()
                                    .slice(0, 10)}
                                </span>
                                {!actividad.completado && (
                                  <button
                                    onClick={() =>
                                      completarActividad(actividad)
                                    }
                                  >
                                    <Check className="h-5 w-5  text-green-600 hover:text-green-900" />
                                  </button>
                                )}
                                <div>
                                  <button
                                    onClick={() =>
                                      eliminarActividadFn(actividad)
                                    }
                                  >
                                    <Trash className="h-5 w-5 text-red-600 hover:text-red-900" />
                                  </button>
                                </div>
                                <PencilLineIcon
                                  className="h-5 w-5 text-gray-600 hover:text-gray-900"
                                  onClick={() =>
                                    actualizarActividadFn(actividad)
                                  }
                                />
                              </div>
                            </div>
                            <p className="text-gray-600 mt-1">
                              {actividad.descripcion}
                            </p>
                            <div className="flex items-center space-x-2 mt-2">
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize ${
                                  actividad.completado
                                    ? "bg-green-100 text-green-800"
                                    : "bg-yellow-100 text-yellow-800"
                                }`}
                              >
                                {actividad.completado
                                  ? "Completado"
                                  : "Pendiente"}
                              </span>
                              <span className="text-xs text-gray-500 capitalize">
                                {actividad.tipo}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p>No hay actividades disponibles</p>
                    )}
                  </>
                </div>
              </div>
            </div>

            {/* Panel lateral */}
            <div className="space-y-6">
              {/* Acciones rápidas */}
              <AccionesRapidasCliente
                cliente={cliente}
                isMobile={isMobile}
                esAdmin={currentUser.rol === "admin"}
                onLlamar={() =>
                  crearActividad({
                    actividadData: {
                      titulo: "Llamada",
                      fecha: new Date(),
                      cliente_id: cliente.id,
                      descripcion: "Se ha llamado al cliente ",
                      tipo: "llamada",
                      completado: true,
                    },
                    currentUser: currentUser,
                  })
                }
                onEmailMovil={() =>
                  crearActividad({
                    actividadData: {
                      titulo: "Email",
                      fecha: new Date(),
                      cliente_id: cliente.id,
                      descripcion: "Se ha enviado un correo al cliente ",
                      tipo: "email",
                      completado: true,
                    },
                    currentUser: currentUser,
                  })
                }
                onEmailDesktop={() =>
                  abrirGmail({
                    cliente,
                    currentUser,
                    navigate,
                    crearActividad,
                  })
                }
                onAgendarReunion={() => setModalCopen(true)}
                onCrearPedido={() => setModalPedidoVisible(true)}
                onAsignarVendedor={() => setModalVendedorVisible(true)}
                onEliminarDefinitivamente={handleEliminarDefinitivamente}
              />

              {/* Resumen de ventas */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Resumen de Ventas
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Valor Total</p>
                    <p className="text-2xl font-bold text-green-600">
                      $
                      {pedidosFiltrados()
                        ? Number(
                            pedidosFiltrados()?.reduce(
                              (total, pedido) => total + Number(pedido.total),
                              0,
                            ),
                          ).toLocaleString()
                        : "0"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Pedidos Realizados</p>
                    <p className="text-xl font-semibold text-gray-900">
                      {pedidosFiltrados()?.length ?? 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Última Compra</p>
                    <p className="text-sm text-gray-900">
                      {ultimaCompra?.fecha_creacion
                        ? dayjs(ultimaCompra.fecha_creacion).format(
                            "D [de] MMMM [de] YYYY",
                          )
                        : "No ha comprado"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setModalOpen(false);
          }}
          title={"Editar Cliente"}
        >
          <ClienteForm
            onSubmit={handleUpdateCliente}
            initialData={cliente || undefined}
            accion={!pendigEditar ? "Editar Cliente" : "Editando"}
          />
        </Modal>
        <Modal
          isOpen={isModalBOpen}
          onClose={() => {
            setModalBOpen(false);
          }}
          title={"Crear Activida"}
        >
          <CrearActividad
            accion={!pendingActividad ? "Crear Actividad" : "Creando..."}
            id={id}
            onSubmit={handleCrearActividad}
          />
        </Modal>
        <Modal
          isOpen={isModalCOpen}
          onClose={() => {
            setModalCopen(false);
          }}
          title={"Crear Reunion"}
        >
          <CrearReunion
            accion={!pendingReunion ? "Crear Reunion" : "Creando..."}
            cliente_id={id}
            onSubmit={handleCrearReunion}
          />
        </Modal>
        <Modal
          isOpen={modalPedidoVisible}
          onClose={() => {
            setModalPedidoVisible(false);
          }}
          title={"Crear Pedido"}
        >
          <CrearPedido
            accion={!isPendingPedido ? "Crear Pedido" : "Creando..."}
            onSubmit={handleCrearPedido}
          />
        </Modal>
        <Modal
          isOpen={modalVendedorVisible}
          onClose={() => {
            setModalVendedorVisible(false);
          }}
          title={"Asignar Vendedor"}
        >
          <SelectVendedor
            cliente={cliente}
            closeModal={() => setModalVendedorVisible(false)}
          />
        </Modal>
        {handlers && (
          <ConfirmarAccionToast
            visible={mostrarToastInvitacion}
            setVisible={setMostrarToastInvitacion}
            onConfirm={handlers.handleConfirm}
            onCancel={handlers.handleCancel}
            texto={handlers.texto}
            posicion="bottom-right"
            tema="dark"
            modoModal={true}
          />
        )}
        {handlersEliminar && (
          <ConfirmarAccionToast
            visible={mostrarToastEliminar}
            setVisible={setMostrarToastEliminar}
            onConfirm={handlersEliminar.handleConfirm}
            onCancel={handlersEliminar.handleCancel}
            texto={handlersEliminar.texto}
            posicion="bottom-right"
            tema="dark"
            modoModal={true}
          />
        )}
        <ActualizarActividadModal
          isOpen={isModalActualizarOpen}
          onClose={() => setModalActualizarOpen(false)}
          actividad={actividadSeleccionada}
        />
      </Layout>
    );
  }
};
