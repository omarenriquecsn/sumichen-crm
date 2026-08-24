import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/useAuth";
import { Vendedor } from "../types";

const URL = (import.meta.env.VITE_BACKEND_URL ?? "").toString();

export interface RegistrarUsuarioPayload {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  rol: "vendedor" | "admin";
}

/**
 * Hook para registrar un usuario NUEVO (vendedor o admin) por parte del admin
 * principal (Omar Contreras). Llama a POST /usuarios/registrar, que crea el
 * usuario en Supabase Auth + su perfil en vendedores con el rol elegido.
 */
export function useRegistrarUsuario() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<Vendedor, Error, RegistrarUsuarioPayload>({
    mutationFn: async (payload: RegistrarUsuarioPayload) => {
      const res = await fetch(`${URL}/usuarios/registrar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: session?.access_token
            ? `Bearer ${session.access_token}`
            : "",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const texto = await res.text();
      let data: { message?: string; data?: Vendedor };
      try {
        data = texto ? JSON.parse(texto) : {};
      } catch {
        data = {};
      }

      if (!res.ok) {
        const msg =
          (data as { message?: string }).message ||
          texto ||
          "Error al registrar el usuario";
        throw new Error(msg);
      }

      return (data as { data?: Vendedor }).data as Vendedor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendedores"] });
    },
  });
}