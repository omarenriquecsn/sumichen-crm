import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  Calendar,
  Ticket,
  ShoppingCart,
  BarChart3,
  Settings,
  LogOut,
  Shield,
  Building2,
  X,
  Plus,
  Sheet,
  Download,
  UserPlus,
  MapPin,
  MessageSquare,
  BarChart2,
  Smartphone,
} from 'lucide-react';
import { UserData } from '../../context/types';
import { esAdminPrincipal } from '../../constants/adminPrincipal';
import { useInstalarApp } from '../../hooks/useInstalarApp';
import { InstalarAppModal } from '../ui/InstalarAppModal';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  userDataProp?: UserData
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, userDataProp }) => {
  const { userData: userDataContex, currentUser, signOut } = useAuth();
  const { disponible, instalar } = useInstalarApp();
  const [mostrarInstrucciones, setMostrarInstrucciones] = React.useState(false);

  const userData = userDataProp || userDataContex;
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleInstalar = async () => {
    const res = await instalar();
    if (res.resultado === 'instrucciones') {
      setMostrarInstrucciones(true);
    }
  };

  const vendedorLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/clientes', icon: Users, label: 'Clientes' },
    { to: '/pipeline', icon: TrendingUp, label: 'Pipeline de Ventas' },
    { to: '/reuniones', icon: Calendar, label: 'Reuniones' },
    { to: '/tickets', icon: Ticket, label: 'Tickets' },
    { to: '/pedidos', icon: ShoppingCart, label: 'Pedidos' },
    { to: '/productos', icon: ShoppingCart, label: 'Productos' },
    { to: '/leads', icon: Users, label: 'Mis Leads' },
    { to: '/chat', icon: MessageSquare, label: 'Chats' },
    { to: '/analitica', icon: BarChart3, label: 'Analítica' },
    { to: '/configuracion', icon: Settings, label: 'Configuración' },
  ];

  const adminLinks = [
    { to: '/admin', icon: Shield, label: 'Panel Admin' },
    { to: '/dashboard', icon: LayoutDashboard, label: 'Mi Dashboard' },
    { to: '/vendedores', icon: Users, label: 'Vendedores' },
    { to: '/clientes', icon: Users, label: 'Clientes' },
    { to: '/pedidos', icon: ShoppingCart, label: 'Pedidos' },
    { to: '/crearProductos', icon: Plus, label: 'Crear Productos'},
    { to: '/excel', icon: Sheet, label: 'Excel de Productos' },
    { to: '/productos', icon: ShoppingCart, label: 'Productos' },
    { to: '/descargas', icon: Download, label: 'Descargas DB' },
    { to: '/zonas', icon: MapPin, label: 'Zonas' },
    { to: '/leads', icon: Users, label: 'Todos los Leads' },
    { to: '/chat', icon: MessageSquare, label: 'Chats' },
    { to: '/marketing', icon: BarChart2, label: 'Marketing' },
    { to: '/configuracion', icon: Settings, label: 'Configuración' },
  ];

  // Enlace exclusivo del admin PRINCIPAL (Omar Contreras)
  const adminPrincipalLink = [
    { to: '/registro-usuarios', icon: UserPlus, label: 'Registrar Usuarios' },
  ];

  // Los vendedores solo ven el menú de vendedor. Los admins ven el menú admin;
  // además, Omar (admin principal) ve el enlace "Registrar Usuarios" al final
  // (debajo de "Descargas DB").
  const esOmar = esAdminPrincipal(
    (currentUser as { supabase_id?: string })?.supabase_id,
    (userData as { supabase_id?: string })?.supabase_id
  );
  const links =
    userData?.rol === 'admin'
      ? esOmar
        ? [...adminLinks, ...adminPrincipalLink]
        : adminLinks
      : vendedorLinks;

  return (
    <>
      {/* Backdrop para móvil */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-30 z-30 lg:hidden transition-opacity ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      ></div>

      <div
        className={`fixed lg:relative inset-y-0 left-0 transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 transition-transform duration-300 ease-in-out bg-white h-screen w-64 shadow-lg flex flex-col border-r border-gray-200 z-40`}
      >
      {/* Logo y título */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-xl">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">CRM Pro</h1>
            <p className="text-sm text-gray-500">Sistema de Ventas</p>
          </div>
        </div>
          <button onClick={onClose} className="lg:hidden text-gray-500 hover:text-gray-800">
            <X className="h-6 w-6" />
          </button>
      </div>

      {/* Información del usuario */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 font-semibold">
              {userData?.nombre?.charAt(0)}{userData?.apellido?.charAt(0)}
            </span>
          </div>
          <div>
            <p className="font-medium text-gray-900">
              {userData?.nombre} {userData?.apellido}
            </p>
            <p className="text-sm text-gray-500 capitalize">
              {userData?.rol}
            </p>
          </div>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-r-2 border-blue-700 shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <link.icon className="h-5 w-5" />
            <span className="font-medium">{link.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Botón de instalar app (solo si la app no está instalada) */}
      <div className="px-4 pb-2 border-t border-gray-200">
        {disponible && (
          <button
            onClick={handleInstalar}
            className="flex items-center space-x-3 px-4 py-3 w-full text-left text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200"
          >
            <Smartphone className="h-5 w-5" />
            <span className="font-medium">Instalar app</span>
          </button>
        )}
      </div>

      {/* Botón de cerrar sesión */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="flex items-center space-x-3 px-4 py-3 w-full text-left text-gray-600 hover:bg-red-50 hover:text-red-700 rounded-lg transition-all duration-200"
        >
          <LogOut className="h-5 w-5" />
          <span className="font-medium">Cerrar Sesión</span>
        </button>
      </div>
      </div>

      <InstalarAppModal
        open={mostrarInstrucciones}
        onClose={() => setMostrarInstrucciones(false)}
      />
    </>
  );
};