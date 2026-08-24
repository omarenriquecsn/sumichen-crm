import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { esAdminPrincipal } from "../../constants/adminPrincipal";

interface SoloOmarRouteProps {
  children: React.ReactNode;
}

/**
 * Ruta restringida al admin PRINCIPAL (Omar Contreras).
 * Además de exigir sesión y rol admin, verifica que el usuario autenticado sea
 * específicamente Omar. Cualquier otro admin/vendedor es redirigido al dashboard.
 * (El backend valida lo mismo en POST /usuarios/registrar.)
 */
export const SoloOmarRoute: React.FC<SoloOmarRouteProps> = ({ children }) => {
  const { currentUser, userData, loading } = useAuth();

  // Espera a que todos los datos estén listos
  if (loading || currentUser === undefined) {
    return <LoadingSpinner />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const esOmar =
    userData?.rol === "admin" &&
    esAdminPrincipal(
      (currentUser as { supabase_id?: string }).supabase_id,
      (userData as { supabase_id?: string }).supabase_id
    );

  if (!esOmar) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};