import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
  redirectTo?: string;
}
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole,
  redirectTo = '/dashboard'
}) => {
  const { currentUser, userData, loading } = useAuth();
  const location = useLocation();

  // Espera a que todos los datos estén listos
  if (loading || currentUser === undefined) {
    return <LoadingSpinner />;
  }

  // Si no hay usuario autenticado, redirige al login recordando la ruta
  // intentada (ej. deep link de una notificación push a /pedidos/:id) para
  // volver a ella después de iniciar sesión.
  if (!currentUser) {
    const destino = `${location.pathname}${location.search}`;
    const redirect =
      destino && destino !== '/'
        ? `?redirect=${encodeURIComponent(destino)}`
        : '';
    return <Navigate to={`/login${redirect}`} replace />;
  }

  // Si se requiere un rol específico y no coincide, redirige al destino
  // indicado (por defecto /dashboard). Se conserva el query string para no
  // perder deep-links con acciones (ej. ?accion=atender de las notificaciones).
  if (requiredRole && userData?.rol !== requiredRole) {
    const destino = location.search
      ? `${redirectTo}${location.search}`
      : redirectTo;
    return <Navigate to={destino} replace />;
  }

  return <>{children}</>;
};