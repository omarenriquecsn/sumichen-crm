import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Meta as MetasFormState } from "../types";
import { useAuth } from "../context/useAuth";
import { toast } from "react-toastify";

const URL = import.meta.env.VITE_BACKEND_URL;
// Obtener metas de un vendedor (por mes o todos)
export function useGetMetas(vendedorId: string) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["metas"],
    queryFn: async () => {
      const res = await fetch(
        `${URL}/metas/${vendedorId}`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
        }
      );
      if (!res.ok) {
        throw new Error("Error al obtener metas");
      }
      return res.json();
    },
    enabled: !!vendedorId,
  });
}


// Crear o actualizar metas de un vendedor
export function usePostMetas() {
  const { session } = useAuth();

  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      vendedorId,
      metas,
    }: {
      vendedorId: string;
      metas: Partial<MetasFormState>;
    }) => {
      if (!vendedorId) throw new Error("ID de vendedor es requerido");
      metas.ano = new Date().getFullYear();
      metas.vendedor_id = vendedorId;
      const res = await fetch(`${URL}/metas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        credentials: "include",
        body: JSON.stringify(metas),
      });
      if (!res.ok) {
        toast.error("Error al guardar metas");
        throw new Error("Error al guardar metas");
      }
      toast.success("Metas guardadas correctamente");
      return res.json();
    },
    onSuccess: (_, { vendedorId }) => {
      queryClient.invalidateQueries({ queryKey: ["metas", vendedorId] });
    },
  });
}
