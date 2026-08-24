import React from 'react';
import { Navigate } from 'react-router-dom';
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

  // Espera a que todos los datos estén listos
  if (loading || currentUser === undefined) {
    return <LoadingSpinner />;
  }

  // Si no hay usuario autenticado, redirige al login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Si se requiere un rol específico y no coincide, redirige
  if (requiredRole && userData?.rol !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};