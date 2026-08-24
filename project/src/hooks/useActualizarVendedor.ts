// ...existing code...
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/useAuth";
import { Vendedor } from "../types";

const URL = (import.meta.env.VITE_BACKEND_URL ?? "").toString();

/**
 * Hook para obtener la lista de vendedores
 */
function useVendedores() {
  const { session } = useAuth();

  return useQuery<Vendedor[], Error>({
    queryKey: ["vendedores"],
    queryFn: async () => {
      const res = await fetch(`${URL}/usuarios`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
        },
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Error al obtener vendedores");
      }

      const data = await res.json();
      return (data as Vendedor[]) ?? [];
    },
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
}

export default useVendedores;

// Hook para actualizar un vendedor: PATCH /usuarios/:id
export function useActualizarVendedor() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<Vendedor, Error, { id: string; datos: Partial<Vendedor> }>({
    mutationFn: async ({ id, datos }: { id: string; datos: Partial<Vendedor> }) => {
      const res = await fetch(`${URL}/usuarios/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
        },
        credentials: "include",
        body: JSON.stringify(datos),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Error al actualizar vendedor");
      }

      const data: Vendedor = await res.json();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendedores"] });
    },
  });
}
// ...existing code...