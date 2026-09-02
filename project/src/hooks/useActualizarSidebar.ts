import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/useAuth";

const URL = (import.meta.env.VITE_BACKEND_URL ?? "").toString();

/**
 * Guarda las preferencias del menú lateral del usuario AUTENTICADO
 * (PUT /usuarios/perfil con `sidebar_oculto`). Solo cambia la visibilidad
 * del sidebar; las rutas siguen siendo accesibles por URL.
 */
export function useActualizarSidebar() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<{ message: string; data: unknown }, Error, string[]>({
    mutationFn: async (sidebarOculto: string[]) => {
      const res = await fetch(`${URL}/usuarios/perfil`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: session?.access_token
            ? `Bearer ${session.access_token}`
            : "",
        },
        credentials: "include",
        body: JSON.stringify({ sidebar_oculto: sidebarOculto }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Error al guardar las preferencias del menú");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userData"] });
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    },
  });
}
