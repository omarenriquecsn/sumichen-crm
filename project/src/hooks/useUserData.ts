import { useQuery } from "@tanstack/react-query";
import { User } from "@supabase/supabase-js";
import { UserData } from "../context/types";
import { supabase } from "../lib/supabase";

const URL = import.meta.env.VITE_BACKEND_URL;

// Obtiene el token de sesión actual de Supabase (para el header Authorization)
const getAccessToken = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
};

export const useUserData = (userId?: string) => {
  return useQuery<UserData | null>({
    queryKey: ["userData", userId],
    queryFn: async () => {
      if (!userId) return null;

      const accessToken = await getAccessToken();
      const usuarioDB = await fetch(`${URL}/usuarios/${userId}`, {
        headers: {
          Authorization: accessToken ? `Bearer ${accessToken}` : "",
        },
      }).then((res) => res.json());

      if (!usuarioDB) {
        console.warn("No se encontro el usuario");
        return null;
      }

      const user: User | null = usuarioDB.user;

      return {
        id: usuarioDB.id,
        email: user?.email || "",
        nombre: usuarioDB.nombre,
        apellido: usuarioDB.apellido,
        rol: usuarioDB.rol,
        activo: usuarioDB.activo,
        telefono: usuarioDB.telefono,
        avatar: user?.user_metadata?.avatar_url || "",
        sidebar_oculto: usuarioDB.sidebar_oculto ?? [],
        firma_url: usuarioDB.firma_url ?? undefined,
      };
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
};


export const useCurrentUser = (userId?: string) => {
  return useQuery<User | null>({
    queryKey: ["currentUser", userId],
    queryFn: async () => {
      if (!userId) return null;

      const accessToken = await getAccessToken();
      const currentUserDB = await fetch(`${URL}/usuarios/${userId}`, {
        headers: {
          Authorization: accessToken ? `Bearer ${accessToken}` : "",
        },
      }).then((res) => res.json());

      if (!currentUserDB) {
        console.warn("No se encontro el usuario");
        return null;
      }
      return currentUserDB;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
};
