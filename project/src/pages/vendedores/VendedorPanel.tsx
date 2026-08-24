import { useParams } from "react-router-dom";
import useVendedorDetalle from "../../hooks/useVendedorDetalle"; // Debes crear este hook para traer todos los datos del vendedor
import { Layout } from "../../components/layout/Layout";
import { DashboardVendedor } from "../dashboard/DashboardVendedor";
import { Clientes } from "../clientes/Clientes";
import { Pipeline } from "../ventas/Pipeline";
import { Pedidos } from "../pedidos/Pedidos";
import { useAdmin } from "../../hooks/useAdmin";
import { Tickets } from "../tickets/Tickets";
import { useState } from "react";

export const VendedorPanel = () => {
  const supabase = useAdmin();

  const { id } = useParams<{ id: string }>();

  const { data: vendedor, isLoading, error } = useVendedorDetalle(id!);

  const { data: clientedb } = supabase.useClientes(vendedor?.id);
  const { data: pedidosdb } = supabase.usePedidos(vendedor?.id);
  const { data: actividadesdb } = supabase.useActividades(vendedor?.id);
  const { data: reunionesdb } = supabase.useReuniones(vendedor?.id);
  const { data: oportunidadesdb } = supabase.useOportunidades(vendedor?.id);
  const { data: ticketsdb } = supabase.useTickets(vendedor?.id);

  const [activeTab, setActiveTab] = useState("dashboard");
  if (isLoading)
    return (
      <Layout title="Panel de Vendedor" subtitle="Cargando...">
        <div>Cargando datos del vendedor...</div>
      </Layout>
    );
  if (error)
    return (
      <Layout title="Panel de Vendedor" subtitle="Error al cargar datos">
        <div>Error al cargar datos del vendedor</div>
      </Layout>
    );
  if (!vendedor)
    return (
      <Layout title="Panel de Vendedor" subtitle="No hay datos disponibles">
        <div>No hay datos disponibles</div>
      </Layout>
    );

  // Llama SIEMPRE los hooks, aunque el id sea undefined

  const clientes = Array.isArray(clientedb)
    ? clientedb.filter((c) => c.vendedor_id === vendedor.id)
    : [];
  const pedidos = Array.isArray(pedidosdb)
    ? pedidosdb.filter((p) => p.vendedor_id === vendedor.id)
    : [];
  const actividades = Array.isArray(actividadesdb)
    ? actividadesdb.filter((a) => a.vendedor_id === vendedor.id)
    : [];
  const reuniones = Array.isArray(reunionesdb)
    ? reunionesdb.filter((r) => r.vendedor_id === vendedor.id)
    : [];
  const oportunidades = Array.isArray(oportunidadesdb)
    ? oportunidadesdb.filter((o) => o.vendedor_id === vendedor.id)
    : [];
  const tickets = Array.isArray(ticketsdb)
  ? ticketsdb.filter((t) => t.vendedor_id === vendedor.id)
  : [];


  // data debe contener vendedor, clientes, pedidos, pipeline, etc.
  return (
    <div>
      
      <div className="space-y-6">
        <nav className="mb-6 flex gap-4 bg-white border rounded shadow p-2">
          <button
            className="px-3 py-1 rounded hover:bg-gray-100"
            onClick={() => setActiveTab("dashboard")}
          >
            Dashboard
          </button>
          <button
            className="px-3 py-1 rounded hover:bg-gray-100"
            onClick={() => setActiveTab("clientes")}
          >
            Clientes
          </button>
          <button
            className="px-3 py-1 rounded hover:bg-gray-100"
            onClick={() => setActiveTab("pipeline")}
          >
            Pipeline
          </button>
          <button
            className="px-3 py-1 rounded hover:bg-gray-100"
            onClick={() => setActiveTab("pedidos")}
          >
            Pedidos
          </button>
          <button
            className="px-3 py-1 rounded hover:bg-gray-100"
            onClick={() => setActiveTab("tickets")}
          >
            Tickets
          </button>
        </nav>
      
        {activeTab === "dashboard" && (
          <section>
            <DashboardVendedor
              currentUser={vendedor}
              pedidos={pedidos}
              clientes={clientes}
              actividades={actividades}
              reuniones={reuniones}
              oportunidades={oportunidades}
            />
          </section>
        )}
        {activeTab === "clientes" && (
          <section>
            <Clientes clientes={clientes} pedidos={pedidos} />
          </section>
        )}
        {activeTab === "pipeline" && (
          <section>
            <Pipeline
              currentUserProp={vendedor}
              OportunidadesProp={oportunidades}
              clientesProp={clientes}
            />
          </section>
        )}
        {activeTab === "pedidos" && (
          <section>
            <Pedidos pedidosProp={pedidos} clientesProp={clientes} />
          </section>
        )}
        {activeTab === "tickets" && (
          <section>
            <Tickets ticketsProp={tickets} clientesProp={clientes} />
          </section>
        )}
      </div>
    </div>
  );
};

export default VendedorPanel;
