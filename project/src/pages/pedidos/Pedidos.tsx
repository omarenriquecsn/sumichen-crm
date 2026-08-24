import React, { useState } from "react";
import { Layout } from "../../components/layout/Layout";
import {
  Plus,
  Search,
  Filter,
  ShoppingCart,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  User,
  Calendar,
  DollarSign,
  FileText,
} from "lucide-react";
import { toast } from "react-toastify";
import { useSupabase } from "../../hooks/useSupabase";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);
import {
  Cliente,
  Pedido,
  PedidoData,
  ProductoPedido,
  Vendedor,
} from "../../types";
import { useAuth } from "../../context/useAuth";
import { useNavigate } from "react-router-dom";
import Modal from "../../components/ui/Modal";
import CrearPedido from "../../components/forms/CrearPedido";
import SelectCliente from "../../components/ui/SelectCliente";
import { getEstadoColor, handleCrearPedidoUtil } from "../../utils/pedidos";
import { handleActualizarPedidoUtil } from "../../utils/pedidos";
import useVendedores from "../../hooks/useVendedores";
import { useCrearNotificacion } from "../../hooks/useNotificaciones";

type PedidosProps = {
  pedidosProp?: Pedido[];
  clientesProp?: Cliente[];
};

export const Pedidos: React.FC<PedidosProps> = ({
  pedidosProp,
  clientesProp,
}) => {
  const navigate = useNavigate();
  const { currentUser, session } = useAuth();
  const supabase = useSupabase();

  const { mutate: cancelarPedido } = supabase.useCancelarPedido();

  const { mutate: aprobarPedido } = supabase.useActualizarPedido();

  const { mutate: crearNotificacion } = useCrearNotificacion();

  const [modalPedidoVisible, setModalPedidoVisible] = useState(false);

  const [modalClienteVisible, setModalClienteVisible] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<null | string>(
    null
  );

  const [terminoBusqueda, setTerminoBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");

  const { data: pedidosDb } = supabase.usePedidos();

  const { data: clientesDb } = supabase.useClientes();

  const pedidos = pedidosProp ?? pedidosDb ?? [];
  const clientes = clientesProp ?? clientesDb ?? [];

  //Vendedores
  const { data: vendedoresDb } = useVendedores();

  const { mutate: nuevoPedido, isPending: isCreandoPedido } =
    supabase.useCrearPedido();

  if (!currentUser) {
    toast.error("Debes iniciar sesión para ver los pedidos");
    navigate("/login");
    return;
  }

  const handleCancelarPedido = (id: string) => {
    cancelarPedido(id);
    const elPedido = Array.isArray(pedidos)
      ? pedidos.find((p) => p.id === id)
      : null;
    const clienteDelPedido = Array.isArray(clientes)
      ? clientes.find((c) => c.id === elPedido?.cliente_id)
      : null;
    crearNotificacion({
      vendedor_id: elPedido?.vendedor_id || "",
      tipo: "cancelado",
      descripcion: `El pedido de ${
        clienteDelPedido?.empresa || "el cliente"
      } ha sido cancelado.`,
    });
    toast.success("Pedido cancelado exitosamente.");
  };

  const handleAprobarPedido = (data: Partial<Pedido>) => {
    const { productos_pedido, ...pedido } = data;
    console.log(productos_pedido);
    pedido.estado = "procesado";

    handleActualizarPedidoUtil({
      data: pedido,
      currentUser,
      actualizarPedido: aprobarPedido,
    });
    //Notificacion
    const clienteDelPedido = Array.isArray(clientes)
      ? clientes.find((c) => c.id === data?.cliente_id)
      : null;
    crearNotificacion({
      vendedor_id: pedido?.vendedor_id || "",
      tipo: "aprobado",
      descripcion: `El pedido ${
        clienteDelPedido?.empresa || "el cliente"
      } ha sido aprobado.`,
    });
    toast.success("Pedido aprobado exitosamente.");
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case "borrador":
        return <FileText className="h-4 w-4" />;
      case "enviado":
        return <Package className="h-4 w-4" />;
      case "aprobado":
        return <CheckCircle className="h-4 w-4" />;
      case "rechazado":
        return <XCircle className="h-4 w-4" />;
      case "procesando":
        return <Clock className="h-4 w-4" />;
      case "completado":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <ShoppingCart className="h-4 w-4" />;
    }
  };

  const cliente = (cliente_id: string) => {
    if (!Array.isArray(clientes)) return undefined;
    return clientes.find((c) => c.id === cliente_id);
  };

  const vendedor = (vendedor_id: string) => {
    if (!Array.isArray(vendedoresDb)) return undefined;
    return vendedoresDb.find((v) => v.id === vendedor_id);
  };

  const pedidosFiltrados = (Array.isArray(pedidos) ? pedidos : [])
    .filter((pedido) => {
      if (filtroEstado === "todos") return true;
      return pedido.estado === filtroEstado;
    })
    .filter((pedido) => {
      if (!terminoBusqueda.trim()) return true;
      const busquedaLower = terminoBusqueda.toLowerCase();
      const empresa = cliente(pedido.cliente_id)?.empresa?.toLowerCase() || "";
      const nombreCliente = cliente(pedido.cliente_id)
        ? `${cliente(pedido.cliente_id)?.nombre ?? ""} ${
            cliente(pedido.cliente_id)?.apellido ?? ""
          }`.toLowerCase()
        : "";
      const nombreVendedor = vendedor(pedido.vendedor_id)
        ? `${vendedor(pedido.vendedor_id)?.nombre ?? ""} ${
            vendedor(pedido.vendedor_id)?.apellido ?? ""
          }`.toLowerCase()
        : "";
      return (
        pedido.numero?.toString().toLowerCase().includes(busquedaLower) ||
        pedido.cliente_id?.toLowerCase().includes(busquedaLower) ||
        pedido.estado?.toLowerCase().includes(busquedaLower) ||
        pedido.total?.toString().toLowerCase().includes(busquedaLower) ||
        empresa.includes(busquedaLower) ||
        nombreCliente.includes(busquedaLower) ||
        nombreVendedor.includes(busquedaLower)
      );
    });

  const estadisticas = {
    total: pedidos?.length ?? 0,
    pendientes: (Array.isArray(pedidos) ? pedidos : []).filter(
      (p) => p.estado === "pendiente"
    ).length,
    aprobados: (Array.isArray(pedidos) ? pedidos : []).filter(
      (p) => p.estado === "procesado"
    ).length,

    valorTotal: (Array.isArray(pedidos) ? pedidos : []).reduce(
      (sum, p) => sum + Number(p.total),
      0
    ),
  };

  const handleCrearPedido = (data: PedidoData) => {
    handleCrearPedidoUtil({
      data,
      currentUser,
      clienteSeleccionado,
      nuevoPedido,
      setModalPedidoVisible,
    });

    const elVendedor = Array.isArray(vendedoresDb)
      ? vendedoresDb.find((v) => v.id === currentUser.id)
      : null;
    crearNotificacion({
      vendedor_id: "425dd7b1-faef-40d2-9121-1febed7712b6",
      tipo: "aprobado",
      descripcion: `${
        elVendedor?.nombre || "Un vendedor"
      } ha creado un nuevo pedido.`,
    });
  };

  return (
    <Layout
      title="Gestión de Pedidos"
      subtitle="Administra las solicitudes de pedidos de tus clientes"
    >
      <div className="space-y-6">
        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-100">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-600">Total</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {estadisticas.total}
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-100">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-600">
                Enviados
              </span>
            </div>
            <p className="text-2xl font-bold text-blue-600 mt-2">
              {estadisticas.pendientes}
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-100">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-gray-600">
                Aprobados
              </span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-2">
              {estadisticas.aprobados}
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-100">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <span className="text-sm font-medium text-gray-600">
                Procesando
              </span>
            </div>
            <p className="text-2xl font-bold text-yellow-600 mt-2">
              {estadisticas.pendientes}
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-100">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              <span className="text-sm font-medium text-gray-600">
                Completados
              </span>
            </div>
            <p className="text-2xl font-bold text-emerald-600 mt-2">
              {estadisticas.aprobados}
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-100">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-gray-600">
                Valor Total
              </span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-2">
              ${estadisticas.valorTotal.toFixed(2)}
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
                placeholder="Buscar pedidos..."
                value={terminoBusqueda}
                onChange={(e) => setTerminoBusqueda(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
              />
            </div>

            {/* Filtros */}
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="todos">Todos los estados</option>
                <option value="pendiente">Pendientes</option>
                <option value="procesado">procesado</option>
              </select>
            </div>
          </div>

          {/* Botón nuevo pedido */}
          <button
            onClick={() => {
              setModalClienteVisible(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Nuevo Pedido</span>
          </button>
        </div>
        {!pedidosFiltrados?.length && (
          <div className="text-center text-gray-600 mt-4">
            No se encontraron pedidos
          </div>
        )}
        {/* Lista de pedidos */}
        <div className="space-y-4">
          {pedidosFiltrados?.map((pedido) => (
            <div
              key={pedido.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div
                    className={`p-3 rounded-lg ${getEstadoColor(
                      pedido.estado
                    )}`}
                  >
                    {getEstadoIcon(pedido.estado)}
                  </div>
                  <div>
                    {/* <h3 className="text-lg font-semibold text-gray-900">
                     Pedido Nº {pedido.numero}
                    </h3> */}
                    <div className="flex items-center space-x-4 mt-1">
                      <div className="flex items-center space-x-1">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {cliente(pedido.cliente_id)?.empresa}
                        </span>
                      </div>
                      <div className="lg:block md:block hidden">
                        <p className="text-sm font-medium text-gray-600">
                          Fecha de Creación
                        </p>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {dayjs(pedido.fecha_creacion).format("DD/MM/YYYY")}
                          </span>
                        </div>
                      </div>
                      <div className="lg:block md:block hidden">
                        <p className="text-sm font-medium text-gray-600">
                          Fecha de Entrega
                        </p>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {dayjs
                              .utc(pedido.fecha_entrega)
                              .format("DD/MM/YYYY")}
                          </span>
                        </div>
                      </div>
                      {currentUser?.rol === "admin" && (
                        <div className="lg:block md:block hidden">
                          <p className="text-sm font-medium text-gray-600">
                            Vendedor
                          </p>
                          <p className="text-sm font-medium text-gray-600">
                            {
                              vendedoresDb?.find(
                                (v: Vendedor) => v.id === pedido.vendedor_id
                              )?.nombre
                            }
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${getEstadoColor(
                      pedido.estado
                    )}`}
                  >
                    {pedido.estado}
                  </span>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    ${pedido.total.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Productos */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="font-medium text-gray-900 mb-3">Productos</h4>
                <div className="space-y-2">
                  {pedido.productos_pedido.map((producto: ProductoPedido) => (
                    <div
                      key={producto.id}
                      className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {producto.producto.nombre}
                        </p>
                        <p className="text-sm text-gray-500">
                          Cantidad: {producto.cantidad} × $
                          {producto.precio_unitario}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          ${producto.total}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Acciones */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => navigate(`/pedidos/${pedido.id}`)}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Ver Detalles
                    </button>
                    {session?.user.user_metadata.rol === "admin" && (
                      <button className="text-green-600 hover:text-green-700 text-sm font-medium">
                        Editar
                      </button>
                    )}
                    {/* <button className="text-purple-600 hover:text-purple-700 text-sm font-medium">
                      Duplicar
                    </button> */}
                  </div>
                  {session?.user.user_metadata.rol === "admin" &&
                    pedido.estado === "pendiente" && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleAprobarPedido(pedido)}
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                        >
                          Aprobar
                        </button>
                        <button
                          onClick={() => handleCancelarPedido(pedido.id)}
                          className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal
        isOpen={modalPedidoVisible}
        onClose={() => {
          setModalPedidoVisible(false);
        }}
      >
        <CrearPedido
          onSubmit={handleCrearPedido}
          accion={isCreandoPedido ? "Creando" : "Crear Pedido"}
        />
      </Modal>

      <Modal
        isOpen={modalClienteVisible}
        onClose={() => {
          setModalClienteVisible(false);
        }}
      >
        <SelectCliente
          setClienteSeleccionado={setClienteSeleccionado}
          setModalClienteVisible={setModalClienteVisible}
          setModalFormularioVisible={setModalPedidoVisible}
          clientesProp={clientes}
        />
      </Modal>
    </Layout>
  );
};
