import {
  HashRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthProvider";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { SoloOmarRoute } from "./components/auth/SoloOmarRoute";
import { Login } from "./pages/auth/Login";
// import { Register } from "./pages/auth/Register";
import { DashboardVendedor } from "./pages/dashboard/DashboardVendedor";
import { DashboardAdmin } from "./pages/dashboard/DashboardAdmin";
import { Clientes } from "./pages/clientes/Clientes";
import { ClienteDetalle } from "./pages/clientes/ClienteDetalle";
import { Pipeline } from "./pages/ventas/Pipeline";
import { Reuniones } from "./pages/reuniones/Reuniones";
import { Tickets } from "./pages/tickets/Tickets";
import { Pedidos } from "./pages/pedidos/Pedidos";
import { Analitica } from "./pages/analitica/Analitica";
import { Configuracion } from "./pages/configuracion/Configuracion";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import TicketDetail from "./pages/tickets/TicketsDetail";
import PedidosDetail from "./pages/pedidos/PedidosDetail";
import { ExcelViewer } from "./pages/productos/Productos";
import ExcelProductos from "./components/forms/ExcelProductos";
import Vendedores from "./pages/vendedores/Vendedores";
import { VendedorPanel } from "./pages/vendedores/VendedorPanel";
import AgregarProducto from "./components/forms/AgregarProducto";
import DescargasDB from "./pages/descargas/DescargasDB";
import RegistrarUsuarios from "./pages/usuarios/RegistrarUsuarios";
import Zonas from "./pages/zonas/Zonas";
import Leads from "./pages/leads/Leads";
import ChatLista from "./pages/chat/ChatLista";
import ChatVentana from "./pages/chat/ChatVentana";
import MarketingDashboard from "./pages/marketing/MarketingDashboard";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              {/* Rutas públicas */}

              <Route path="/" element={<Login />} />
              <Route path="/login" element={<Login />} />
              {/* <Route path="/register" element={<Register />} /> */}

              {/* Rutas protegidas */}

              <Route
                path="/excel"
                element={
                  <ProtectedRoute>
                    <ExcelProductos />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/crearProductos"
                element={
                  <ProtectedRoute>
                    <AgregarProducto />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/productos"
                element={
                  <ProtectedRoute>
                    <ExcelViewer />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Navigate to="/dashboard" replace />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardVendedor />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <DashboardAdmin />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/vendedores"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Vendedores />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vendedores/:id"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <VendedorPanel />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/registro-usuarios"
                element={
                  <SoloOmarRoute>
                    <RegistrarUsuarios />
                  </SoloOmarRoute>
                }
              />

              <Route
                path="/clientes"
                element={
                  <ProtectedRoute>
                    <Clientes />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/clientes/:id"
                element={
                  <ProtectedRoute>
                    <ClienteDetalle />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/pipeline"
                element={
                  <ProtectedRoute>
                    <Pipeline />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/reuniones"
                element={
                  <ProtectedRoute>
                    <Reuniones />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/tickets"
                element={
                  <ProtectedRoute>
                    <Tickets />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/tickets/:id"
                element={
                  <ProtectedRoute>
                    <TicketDetail />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/pedidos"
                element={
                  <ProtectedRoute>
                    <Pedidos />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/pedidos/:id"
                element={
                  <ProtectedRoute>
                    <PedidosDetail />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/analitica"
                element={
                  <ProtectedRoute>
                    <Analitica />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/descargas"
                element={
                  <ProtectedRoute>
                    <DescargasDB />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/configuracion"
                element={
                  <ProtectedRoute>
                    <Configuracion />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/zonas"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Zonas />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/leads"
                element={
                  <ProtectedRoute>
                    <Leads />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chat"
                element={
                  <ProtectedRoute>
                    <ChatLista />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chat/:id"
                element={
                  <ProtectedRoute>
                    <ChatVentana />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/marketing"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <MarketingDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="*"
                element={
                  <div className="flex items-center justify-center h-screen">
                    <h1 className="text-4xl font-bold">404 - Página no encontrada</h1>
                  </div>
                }
              />

            </Routes>
          </div>
        </Router>
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
