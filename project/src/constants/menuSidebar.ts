import {
  LayoutDashboard,
  Users,
  TrendingUp,
  Calendar,
  Ticket,
  ShoppingCart,
  BarChart3,
  Settings,
  Shield,
  Plus,
  Sheet,
  Download,
  UserPlus,
  MapPin,
  MessageSquare,
  BarChart2,
  LucideIcon,
} from 'lucide-react';

export interface MenuLink {
  to: string;
  icon: LucideIcon;
  label: string;
}

export const vendedorLinks: MenuLink[] = [
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

export const adminLinks: MenuLink[] = [
  { to: '/admin', icon: Shield, label: 'Panel Admin' },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Mi Dashboard' },
  { to: '/vendedores', icon: Users, label: 'Vendedores' },
  { to: '/clientes', icon: Users, label: 'Clientes' },
  { to: '/pedidos', icon: ShoppingCart, label: 'Pedidos' },
  { to: '/crearProductos', icon: Plus, label: 'Crear Productos' },
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
export const adminPrincipalLink: MenuLink[] = [
  { to: '/registro-usuarios', icon: UserPlus, label: 'Registrar Usuarios' },
];

/**
 * Devuelve los enlaces del menú lateral según el rol del usuario y si es el
 * admin principal (Omar). Misma lógica que tenía el Sidebar: los vendedores
 * solo ven el menú de vendedor; los admins ven el menú admin y, si es Omar,
 * además el enlace "Registrar Usuarios" al final.
 */
export const obtenerLinksMenu = (
  rol: string | undefined,
  esOmar: boolean,
): MenuLink[] => {
  if (rol === 'admin') {
    return esOmar ? [...adminLinks, ...adminPrincipalLink] : adminLinks;
  }
  return vendedorLinks;
};
