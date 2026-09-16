import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
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

  // Si se requiere un rol específico y no coincide, redirige
  if (requiredRole && userData?.rol !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};