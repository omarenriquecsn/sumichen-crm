import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { User, Session } from "@supabase/supabase-js";
// import { UserData } from "./types";
import { AuthContext } from "./AuthContext";
import { useUserData, useCurrentUser } from "../hooks/useUserData";
import { useQueryClient } from "@tanstack/react-query";
const URL = import.meta.env.VITE_BACKEND_URL;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const user_id = session?.user.id || "";

  // UserData
  const { data: userData, refetch: refreshUserData } = useUserData(user_id);
  const queryClient = useQueryClient();

  // CurrentUser
  const { data: currentUser } = useCurrentUser(user_id);
  useEffect(() => {
    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);

      setLoading(false);
    });

    // Escuchar cambios de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (!session?.user) return;

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (
    email: string,
    password: string,
    userData: { nombre: string; apellido: string; rol?: string }
  ): Promise<{ user: User | null; session: Session | null }> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre: userData.nombre,
          apellido: userData.apellido,
          rol: userData.rol || "vendedor",
        },
      },
    });

    if (error) {
      throw error;
    }

    // Si el usuario se crea exitosamente, crear el perfil en la tabla vendedores
    if (data.user) {
      await fetch(`${URL}/usuarios`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre: userData.nombre,
          apellido: userData.apellido,
          rol: userData.rol || "vendedor",
          supabase_id: data.user.id,
        }),
      });
    }

    // Return the user and session
    return { user: data.user, session: data.session };
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }
  };

  const signOut = async () => {
    localStorage.removeItem("sb-syaiyhcnqhhzdhmifynh-auth-token");

    setSession(null);
    queryClient.removeQueries({ queryKey: ["userData", user_id] });
    queryClient.removeQueries({ queryKey: ["currentUser", user_id] });
    setLoading(true);
  };

  const value = {
    currentUser,
    session,
    userData,
    loading,
    signUp,
    signIn,
    signOut,
    refreshUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
