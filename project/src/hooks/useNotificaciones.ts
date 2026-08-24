import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useAuth } from "../context/useAuth";

export interface Notificacion {
  id: string;
  vendedor_id: string;
  tipo: string;
  leida: boolean;
  fecha: string;
  descripcion: string;
}
  const URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

// Recibe el token como argumento
export function useNotificaciones(usuarioId: string) {
  const { session } = useAuth();
  return useQuery<Notificacion[]>({
    queryKey: ["notificaciones", usuarioId],
    queryFn: async () => {
      const { data } = await axios.get<Notificacion[]>(
        `${URL}/notificaciones/${usuarioId}`,
        {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        }
      );
      return data;
    },
    refetchInterval: 60000,
  });
}

export function useMarcarNotificacionLeida(usuarioId: string) {
  const { session } = useAuth();

  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await axios.patch(
        `${URL}/notificaciones/${id}/leida`,
        {},
        {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["notificaciones", usuarioId],
      });
    },
  });
}

export function useCrearNotificacion() {
  const { session } = useAuth();
  const token = session?.access_token;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      nuevaNotificacion: Omit<Notificacion, "id" | "leida" | "fecha">
    ) => {
      await axios.post(`${URL}/notificaciones/`, nuevaNotificacion, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["notificaciones"],
      });
    },
  });
}

export function useEliminarNotificaciones(usuarioId: string) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await axios.delete(`${URL}/notificaciones/${usuarioId}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificaciones", usuarioId] });
    },
  });
}