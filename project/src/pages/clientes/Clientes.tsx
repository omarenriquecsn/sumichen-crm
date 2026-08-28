import React, { useState, useEffect } from "react";
import { Layout } from "../../components/layout/Layout";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Filter,
  Phone,
  Mail,
  User,
  // Calendar,
  DollarSign,
  IdCard,
  User2,
  UserCheck,
} from "lucide-react";
import { useSupabase } from "../../hooks/useSupabase";
import { useAuth } from "../../context/useAuth";
import Modal from "../../components/ui/Modal";
import ClienteForm from "../../components/forms/ClienteFom";
import {
  Cliente,
  ClienteFormData,
  CustomerSector,
  Estado,
  EtapaVenta,
  Pedido,
  Vendedor,
} from "../../types";
import { toast } from "react-toastify";
import {
  getEtapaColor,
  getEstadoColor,
  esClienteNuevoEsteMes,
} from "../../utils/clientes";
import useVendedores from "../../hooks/useVendedores";
import {
  guardarEstadoVista,
  recuperarEstadoVista,
} from "../../utils/vistaListas";

type PropsClientes = {
  clientes?: Cliente[];
  pedidos?: Pedido[];
};

export const Clientes: React.FC<PropsClientes> = (props) => {
  const [isModalOpen, setModalOpen] = useState(false);
  const estadoVistaClientes = recuperarEstadoVista("clientes:vista", {
    page: 1,
    searchTerm: "",
    filterEstado: "todos",
    soloNuevos: false,
    filterSector: "todos",
    buscarSoloNotas: false,
  });
  const [searchTerm, setSearchTerm] = useState(estadoVistaClientes.searchTerm);
  const [filterEstado, setFilterEstado] = useState(
    estadoVistaClientes.filterEstado
  );
  const [soloNuevos, setSoloNuevos] = useState(
    estadoVistaClientes.soloNuevos
  );
  const [filterSector, setFilterSector] = useState(
    estadoVistaClientes.filterSector
  );
  const [buscarSoloNotas, setBuscarSoloNotas] = useState(
    estadoVistaClientes.buscarSoloNotas
  );
  const [page, setPage] = useState(estadoVistaClientes.page);
  const pageSize = 6; // Puedes cambiar este valor si lo deseas

  useEffect(() => {
    return () => {
      guardarEstadoVista("clientes:vista", {
        page,
        searchTerm,
        filterEstado,
        soloNuevos,
        filterSector,
        buscarSoloNotas,
      });
    };
  }, [page, searchTerm, filterEstado, soloNuevos, filterSector, buscarSoloNotas]);

  const supabase = useSupabase();

  const navigate = useNavigate();

  const { currentUser } = useAuth();

  // Local state for clientes and pedidos if not provided as props
  const { data: fetchedClientes } = supabase.useClientes();
  const { data: fetchedPedidos } = supabase.usePedidos();

  const clientes = props.clientes ?? fetchedClientes ?? [];

  const pedidos = props.pedidos ?? fetchedPedidos ?? [];

  const { data: Vendedores } = useVendedores();

  const { mutate: crearCliente, isPending } = supabase.useCrearCliente();
  const handleCreateCliente = (user: ClienteFormData) => {
    if (!currentUser) {
      toast.error("Usuario no logueado");
      navigate("/login");
      return;
    }

    crearCliente(
      {
        clienteData: {
          ...user,
          estado: user.estado as Estado,
          etapa_venta: user.etapa_venta as EtapaVenta,
          sector: user.sector as CustomerSector
        },
        currentUser,
      },
      {
        onSuccess: () => {
          toast.success("Cliente creado exitosamente");
          setModalOpen(false);
        },
        onError: (error: unknown) => {
          const msg =
            error instanceof Error && error.message
              ? error.message
              : "El cliente ya existe o hubo un error al crearlo";
          toast.error(msg);
        },
      }
    );
  };

  const pedidosPorCliente = (clienteId: string) => {
    const pedidosArray = Array.isArray(pedidos) ? pedidos : [];
    const pedidosFiltrados = pedidosArray.filter(
      (pedido) => pedido.cliente_id === clienteId
    );
    return pedidosFiltrados;
  };

  const clientesArray = Array.isArray(clientes) ? clientes : [];
  const filteredClientes = clientesArray.filter((cliente) => {
    const termino = searchTerm.trim().toLowerCase();
    let matchesSearch: boolean;
    if (buscarSoloNotas) {
      matchesSearch =
        !termino || (cliente.notas ?? "").toLowerCase().includes(termino);
    } else {
      matchesSearch =
        !termino ||
        cliente.rif.toLowerCase().includes(termino) ||
        cliente.nombre.toLowerCase().includes(termino) ||
        cliente.apellido.toLowerCase().includes(termino) ||
        cliente.email.toLowerCase().includes(termino) ||
        cliente.telefono.toLowerCase().includes(termino) ||
        (cliente.empresa ?? "").toLowerCase().includes(termino) ||
        (cliente.ciudad ?? "").toLowerCase().includes(termino);
    }

    const matchesFilter =
      filterEstado === "todos" || cliente.estado === filterEstado;

    const matchesNuevos = !soloNuevos || esClienteNuevoEsteMes(cliente);

    const matchesSector =
      filterSector === "todos" || cliente.sector === filterSector;

    return (
      matchesSearch && matchesFilter && matchesNuevos && matchesSector
    );
  });
  const totalPages = Math.ceil(filteredClientes.length / pageSize);
  const paginaEfectiva = Math.min(page, Math.max(1, totalPages));
  const paginatedClientes = filteredClientes.slice(
    (paginaEfectiva - 1) * pageSize,
    paginaEfectiva * pageSize
  );

  return (
    <Layout
      title="Gestión de Clientes"
      subtitle="Administra tu cartera de clientes y prospectos"
    >
      <div className="space-y-6">
        {/* Barra de herramientas */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 flex-1">
            {/* Búsqueda */}
            <div className="relative flex-1 max-w-md">
              <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder={
                  buscarSoloNotas
                    ? "Buscar en notas del cliente..."
                    : "Buscar por RIF, empresa, contacto o ciudad..."
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filtros */}
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="todos">Todos los estados</option>
                <option value="prospecto">Prospectos</option>
                <option value="activo">Activos</option>
                <option value="inactivo">Inactivos</option>
              </select>
              <select
                value={filterSector}
                onChange={(e) => setFilterSector(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="todos">Todos los sectores</option>
                {Object.values(CustomerSector).map((sector) => (
                  <option key={sector} value={sector}>
                    {sector}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Botón agregar cliente */}
          <button
            onClick={() => setModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Nuevo Cliente</span>
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="soloNuevos"
            checked={soloNuevos}
            onChange={() => setSoloNuevos((v) => !v)}
            className="mr-1"
          />
          <label htmlFor="soloNuevos" className="text-sm text-gray-600">
            Clientes nuevos este mes
          </label>
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="buscarSoloNotas"
            checked={buscarSoloNotas}
            onChange={() => setBuscarSoloNotas((v) => !v)}
            className="mr-1"
          />
          <label htmlFor="buscarSoloNotas" className="text-sm text-gray-600">
            Buscar solo en notas del cliente
          </label>
        </div>
        {/* Lista de clientes */}
        {clientesArray.length === 0 ? (
          <div className="text-center text-gray-500 mt-10">
            <p>No se encontraron clientes.</p>
          </div>
        ) : null}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {currentUser?.rol === "vendedor" ? (
                    <th className="text-left py-4 px-6 font-medium text-gray-900">
                      Rif
                    </th>
                  ) : (
                    <th className="text-left py-4 px-6 font-medium text-gray-900">
                      Vendedor
                    </th>
                  )}
                  <th className="text-left py-4 px-6 font-medium text-gray-900">
                    Empresa
                  </th>
                  <th className="text-left py-4 px-6 font-medium text-gray-900">
                    Contacto
                  </th>
                  <th className="text-left py-4 px-6 font-medium text-gray-900">
                    Estado
                  </th>
                  <th className="text-left py-4 px-6 font-medium text-gray-900">
                    Etapa
                  </th>
                  <th className="text-left py-4 px-6 font-medium text-gray-900">
                    Ventas
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedClientes?.map((cliente) => (
                  <tr key={cliente.id} className="hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-1 text-sm text-gray-500">
                        {currentUser?.rol === "vendedor" ? (
                          <>
                            <IdCard className="h-4 w-4" />
                            <span>{cliente.rif.toLocaleString()}</span>
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-10 w-10  text-blue-600" />
                            <span>{`${
                              Vendedores?.find(
                                (vendedor: Vendedor) =>
                                  vendedor.id === cliente.vendedor_id
                              )?.nombre
                            } ${
                              Vendedores?.find(
                                (vendedor: Vendedor) =>
                                  vendedor.id === cliente.vendedor_id
                              )?.apellido
                            }`}</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2 w-60">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-semibold text-sm">
                            {cliente.empresa?.[0]
                              ? cliente.empresa[0].toUpperCase()
                              : "Empresa"}
                          </span>
                        </div>
                        <div>
                          <Link
                            to={`/clientes/${cliente.id}`}
                            className="font-medium text-gray-900 hover:text-blue-600"
                          >
                            {cliente.empresa}
                          </Link>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <div>
                          <Link
                            to={`/clientes/${cliente.id}`}
                            className="font-medium text-gray-900 hover:text-blue-600"
                          >
                            <div className="flex items-center space-x-1 gap-2">
                              <User2 className="h-5 w-5 text-blue-600" />
                              {cliente.nombre} {cliente.apellido}
                            </div>
                          </Link>
                          <div className="flex-column items-center space-x-4 mt-1">
                            <div className="flex items-center space-x-1 text-sm text-gray-500">
                              <Mail className="h-4 w-4" />
                              <span>{cliente.email}</span>
                            </div>
                            <div className="flex items-center space-x-1 text-sm text-gray-500">
                              <Phone className="h-4 w-4" />
                              <span>{cliente.telefono}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getEstadoColor(
                          cliente.estado
                        )}`}
                      >
                        {cliente.estado}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getEtapaColor(
                          cliente.etapa_venta
                        )}`}
                      >
                        {cliente.etapa_venta}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-1">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-gray-900">
                          $
                          {(
                            Number(
                              pedidosPorCliente(cliente.id)?.reduce(
                                (total, pedido) => total + Number(pedido.total),
                                0
                              )
                            ) || 0
                          ).toFixed(2)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="flex justify-center items-center gap-4 mt-6">
          <button
            className={`px-4 py-2 rounded font-semibold transition-colors duration-200
                          ${
                            paginaEfectiva === 1
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow"
                          }
                        `}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={paginaEfectiva === 1}
          >
            ← Anterior
          </button>
          <span className="text-gray-700 font-medium">
            Página {paginaEfectiva} de {totalPages}
          </span>
          <button
            className={`px-4 py-2 rounded font-semibold transition-colors duration-200
                          ${
                            paginaEfectiva === totalPages
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow"
                          }
                        `}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={paginaEfectiva === totalPages}
          >
            Siguiente →
          </button>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-100">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-600">
                Total Clientes
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {clientesArray.length}
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-100">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-gray-600">
                Clientes Activos
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {clientesArray.filter((c) => c.estado === "activo").length}
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-100">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-600">
                Prospectos
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {clientesArray.filter((c) => c.estado === "prospecto").length}
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-100">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-gray-600">
                Total Vendido
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              $
              {(
                Number(
                  (Array.isArray(pedidos) ? pedidos : []).reduce(
                    (total, pedido) => total + Number(pedido.total),
                    0
                  )
                ) || 0
              ).toFixed(2)}
            </p>
          </div>
        </div>
      </div>
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setModalOpen(false);
        }}
        title={"Crear Cliente"}
      >
        <ClienteForm
          onSubmit={handleCreateCliente}
          accion={!isPending ? " Crear Cliente" : "Creando..."}
        />
      </Modal>
    </Layout>
  );
};
