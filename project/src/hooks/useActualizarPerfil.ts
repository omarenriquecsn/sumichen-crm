import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/useAuth";

const URL = (import.meta.env.VITE_BACKEND_URL ?? "").toString();

export interface PerfilData {
  nombre: string;
  apellido: string;
  telefono?: string;
}

// Actualiza el PERFIL PROPIO del usuario autenticado (Configuración → Perfil).
// Solo se envía nombre/apellido/telefono: el email no es editable (persiste).
export function useActualizarPerfil() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (datos: PerfilData) => {
      const res = await fetch(`${URL}/usuarios/perfil`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: session?.access_token
            ? `Bearer ${session.access_token}`
            : "",
        },
        credentials: "include",
        body: JSON.stringify(datos),
      });

      if (!res.ok) {
        let mensaje = "Error al actualizar el perfil";
        try {
          const err = await res.json();
          mensaje = err.message || err.error || mensaje;
        } catch {
          const text = await res.text();
          if (text) mensaje = text;
        }
        throw new Error(mensaje);
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userData"] });
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      queryClient.invalidateQueries({ queryKey: ["vendedores"] });
    },
  });
}
