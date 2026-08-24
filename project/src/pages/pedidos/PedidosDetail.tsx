import { useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useSupabase } from "../../hooks/useSupabase";
import { useAuth } from "../../context/useAuth";
import {
  ArrowLeft,
  User,
  Calendar,
  Clock,
  FileText,
  Package,
  CheckCircle,
  XCircle,
  ShoppingCart,
  Truck,
  CreditCard,
  DollarSign,
  Building,
  Check,
  X,
  VerifiedIcon,
} from "lucide-react";
import { Layout } from "../../components/layout/Layout";
import dayjs from "dayjs";
import { ProductoPedido, Vendedor } from "../../types";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { getEstadoColor } from "../../utils/pedidos";
import { handleActualizarPedidoUtil } from "../../utils/pedidos";
import useVendedores from "../../hooks/useVendedores";
import utc from "dayjs/plugin/utc";
import { useCrearNotificacion } from "../../hooks/useNotificaciones";
import EditarTransporteModal from "../../components/forms/EditarTransporteModal";
dayjs.extend(utc);

const PedidosDetail = () => {
  const { id } = useParams();
  const supabase = useSupabase();
  const { currentUser, session } = useAuth();
  const navigate = useNavigate();

  // Pedidos
  const {
    data: pedidos,
    isLoading: loadingPedidos,
    error: errorPedidos,
  } = supabase.usePedidos();

  const { mutate: actualizarPedido } = supabase.useActualizarPedido();
  const { mutate: cancelarPedido } = supabase.useCancelarPedido();
  const { mutate: crearNotificacion } = useCrearNotificacion();

  const [modalTransporteVisible, setModalTransporteVisible] = useState(false);

  // Clientes
  const {
    data: clientes,
    isLoading: loadingClientes,
    error: errorClientes,
  } = supabase.useClientes();

  //Vendedores
  const { data: vendedores } = useVendedores();

  // Actualizar Pedido

  useMemo(() => {
    const pedidosMap = pedidos?.find((p) => p.id === id);
    if (!pedidosMap) {
      toast.error("No se encontró el pedido.");
      navigate("/pedidos");
    }
  }, [pedidos, id, navigate]);

  if (
    errorPedidos ||
    errorClientes ||
    !currentUser ||
    !session?.user.user_metadata
  ) {
    toast.error("Error al cargar los datos del pedido.");
    navigate("/pedidos");
    return;
  }

  if (loadingPedidos || loadingClientes) {
    return <LoadingSpinner />;
  }

  if (!pedidos || !clientes) {
    toast.error("No se encontraron pedidos.");
    navigate("/pedidos");
    return;
  }

  const pedido = pedidos.find((p) => p.id === id);
  const cliente = clientes.find((c) => c.id === pedido?.cliente_id);

  // Evidencia del pedido: el endpoint /uploads exige JWT. Como <a target="_blank">
  // no puede enviar headers, se agrega el token como query `?access_token=` y el
  // backend lo acepta. El navegador muestra el PDF inline (no lo descarga).
  const evidenciaHref = pedido?.evidencia_url
    ? `${pedido.evidencia_url}${pedido.evidencia_url.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(session?.access_token ?? "")}`
    : undefined;

  if (!pedido || !cliente) {
    toast.error("Pedido no encontrado.");
    navigate("/pedidos");
    return;
  }

  const handleAprobarPedido = () => {
    pedido.estado = "procesado";
    const { productos_pedido, ...pedidoData } = pedido;

    console.log(productos_pedido);
    handleActualizarPedidoUtil({
      data: pedidoData,
      currentUser,
      actualizarPedido,
    });

    //Notificacion
    const clienteDelPedido = Array.isArray(clientes) ? clientes.find(c => c.id === pedido?.cliente_id) : null;
    crearNotificacion({
      vendedor_id: pedido?.vendedor_id || "",
      tipo: "aprobado",
      descripcion: `El pedido ${clienteDelPedido?.empresa || 'el cliente'} ha sido aprobado.`,
    });
    toast.success("Pedido aprobado exitosamente.");
  };

  const handleCancelarPedido = () => {
    const id = pedido.id;
    cancelarPedido(id);
    toast.success("Pedido cancelado exitosamente.");
    //Notificacion
    const clienteDelPedido = Array.isArray(clientes) ? clientes.find(c => c.id === pedido?.cliente_id) : null;
    crearNotificacion({
      vendedor_id: pedido?.vendedor_id || "",
      tipo: "cancelado",
      descripcion: `El pedido ${clienteDelPedido?.empresa || 'el cliente'} ha sido cancelado.`,
    });
    navigate("/pedidos");
  };

  const getEstadoIcon = (estado: string) => {
    const iconProps = { className: "h-8 w-8" };
    switch (estado) {
      case "borrador":
        return <FileText {...iconProps} />;
      case "enviado":
        return <Package {...iconProps} />;
      case "aprobado":
        return <CheckCircle {...iconProps} />;
      case "rechazado":
        return <XCircle {...iconProps} />;
      case "procesando":
        return <Clock {...iconProps} />;
      case "completado":
        return <CheckCircle {...iconProps} />;
      default:
        return <ShoppingCart {...iconProps} />;
    }
  };

  return (
    <Layout
      title="Detalle del Pedido"
      subtitle="Información completa y gestión del pedido"
    >
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Link to="/pedidos" className="flex items-center space-x-2" />
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <Link
          to="/pedidos"
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Volver a Pedidos</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div
                  className={`p-3 rounded-full ${getEstadoColor(
                    pedido.estado
                  )}`}
                >
                  {getEstadoIcon(pedido.estado)}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Pedido #{pedido.numero}
                  </h2>
                  <p className="text-gray-600">
                    Creado el{" "}
                    {dayjs(pedido.fecha_creacion).format("DD/MM/YYYY HH:mm")}
                  </p>
                </div>
              </div>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${getEstadoColor(
                  pedido.estado
                )}`}
              >
                {pedido.estado}
              </span>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Productos</h4>
              <div className="space-y-3">
                {pedido.productos_pedido.map((producto: ProductoPedido) => (
                  <div
                    key={producto.id}
                    className="flex items-center justify-between bg-gray-50 p-4 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {producto.producto.nombre}
                      </p>{" "}
                      <p className="text-sm text-gray-600">
                        Cantidad: {producto.cantidad} x $
                        {producto.precio_unitario}
                      </p>
                    </div>
                    <p className="font-semibold text-gray-900">
                      $
                      {(producto.precio_unitario * producto.cantidad).toFixed(
                        2
                      )}
                    </p>
                  </div>
                ))}
              </div>
              {pedido.evidencia_url && (
                <div className="flex justify-start items-center mt-4">
                  <a
                    href={evidenciaHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-sm"
                  >
                    <FileText className="h-5 w-5 mr-2" /> Ver Orden de Compra
                  </a>
                </div>
              )}
              <div className="flex justify-end items-center border-t border-gray-200 pt-4 mt-4">
                <p className="text-lg font-semibold text-gray-900">
                  Total: ${pedido.total.toLocaleString()}
                </p>
              </div>
              {/* Botón para abrir evidencia si existe */}
            </div>
          </div>
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <h4 className="font-medium text-blue-800 mb-2 flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Notas del Pedido</span>
            </h4>
            <p className="text-blue-700 whitespace-pre-wrap">
              {pedido.notas ? pedido.notas : "No hay notas para mostrar."}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Detalles Adicionales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-start space-x-3 bg-gray-50 p-4 rounded-lg">
                <CreditCard className="h-5 w-5 text-gray-400 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-gray-500">Forma de Pago</p>
                  <p className="font-medium text-gray-900 capitalize">
                    {pedido.tipo_pago === "credito"
                      ? `Crédito (${pedido.dias_credito || "N/A"} días)`
                      : pedido.tipo_pago || "No especificado"}
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 bg-gray-50 p-4 rounded-lg">
                <Truck className="h-5 w-5 text-gray-400 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-gray-500">Transporte</p>
                  <p className="font-medium text-gray-900 capitalize">
                    {pedido.transporte || "No especificado"}
                  </p>
                  {pedido.transporte === "externo" && (
                    <div className="mt-2 space-y-1">
                      {pedido.transporte_detalle ? (
                        <>
                          <p>
                            Nombre: {pedido.transporte_detalle.nombre || "-"}
                          </p>
                          <p>
                            Cédula: {pedido.transporte_detalle.cedula || "-"}
                          </p>
                          <p>
                            Marca: {pedido.transporte_detalle.marca || "-"}
                          </p>
                          <p>
                            Modelo: {pedido.transporte_detalle.modelo || "-"}
                          </p>
                          <p>
                            Placa: {pedido.transporte_detalle.placa || "-"}
                          </p>
                        </>
                      ) : (
                        <p className="text-gray-400">Sin datos registrados</p>
                      )}
                      {(currentUser?.rol === "admin" ||
                        currentUser?.id === pedido.vendedor_id) && (
                        <button
                          onClick={() => setModalTransporteVisible(true)}
                          className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          Editar transporte
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-start space-x-3 bg-gray-50 p-4 rounded-lg">
                <DollarSign className="h-5 w-5 text-gray-400 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-gray-500">Moneda</p>
                  <p className="font-medium text-gray-900">
                    {pedido.moneda || "No especificada"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Panel lateral */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Información del Cliente
            </h3>
            <div className="space-y-4 text-sm">
              <div className="flex items-center space-x-3">
                <User className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-gray-500">Nombre</p>
                  <p className="font-medium text-gray-900">
                    {cliente.nombre} {cliente.apellido}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-gray-400" />{" "}
                <div>
                  <p className="text-gray-500">Fecha de Entrega</p>
                  <p className="font-medium text-gray-900">
                    {dayjs.utc(pedido.fecha_entrega).format("DD/MM/YYYY")}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-gray-500">Última Actualización</p>
                  <p className="font-medium text-gray-900">
                    {dayjs(pedido.fecha_actualizacion).format(
                      "DD/MM/YYYY HH:mm"
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Building className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-gray-500">Empresa</p>
                  <p className="font-medium text-gray-900">{cliente.empresa}</p>
                </div>
              </div>
              {currentUser?.rol === "admin" && (
                <div className="flex items-center space-x-3">
                  <VerifiedIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-gray-500">Vendedor</p>
                    <p className="font-medium text-gray-900">
                      {
                        vendedores?.find(
                          (vendedor: Vendedor) =>
                            vendedor.id === pedido.vendedor_id
                        )?.nombre
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Acciones del Pedido
            </h3>
            <div className="space-y-3">
              {session?.user.user_metadata.rol === "admin" && (
                <button
                  onClick={() => handleAprobarPedido()}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Check className="h-4 w-4" />
                  <span>Aprobar Pedido</span>
                </button>
              )}
            </div>
            <div className="space-y-3 mt-1">
              {session?.user.user_metadata.rol === "admin" && (
                <button
                  onClick={handleCancelarPedido}
                  className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <X className="h-4 w-4" />
                  <span>Cancelar Pedido</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <EditarTransporteModal
        pedidoId={pedido.id}
        transporteActual={pedido.transporte_detalle}
        isOpen={modalTransporteVisible}
        onClose={() => setModalTransporteVisible(false)}
      />
    </Layout>
  );
};

export default PedidosDetail;
