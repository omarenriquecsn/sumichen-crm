import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/useAuth";

const URL = (import.meta.env.VITE_BACKEND_URL ?? "").toString();

/**
 * Sube (o sustituye) la imagen/firma del vendedor autenticado.
 * La imagen es ÚNICA por vendedor: al subir una nueva se reemplaza la anterior
 * (el backend la guarda con el id del vendedor y elimina la previa).
 */
export function useSubirFirma() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<{ message: string; url: string }, Error, File>({
    mutationFn: async (file: File) => {
      if (!session?.access_token) throw new Error("Sin token");
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${URL}/firma`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        credentials: "include",
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Error al subir la imagen");
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

/** Elimina la imagen/firma del vendedor autenticado. */
export function useEliminarFirma() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<{ message: string }, Error, void>({
    mutationFn: async () => {
      if (!session?.access_token) throw new Error("Sin token");
      const res = await fetch(`${URL}/firma`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Error al eliminar la imagen");
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
