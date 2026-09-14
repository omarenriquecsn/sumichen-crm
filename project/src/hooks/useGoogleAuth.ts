import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/useAuth";

const URL = (import.meta.env.VITE_BACKEND_URL ?? "").toString();

/**
 * Conexión de la cuenta de Gmail del vendedor (OAuth2).
 *
 * El backend devuelve la URL de consentimiento de Google (no se puede redirigir
 * con el header Authorization, así que el frontend la pide y luego navega).
 * Tras autorizar, Google vuelve al backend, que guarda los tokens y redirige al
 * frontend con `?google=success|error`.
 */

export interface GoogleStatus {
  configurado: boolean;
  conectado: boolean;
  email: string | null;
}

const authHeaders = (token?: string) => ({
  Authorization: token ? `Bearer ${token}` : "",
});

/** Estado de la conexión Gmail del usuario autenticado. */
export function useGoogleStatus() {
  const { session } = useAuth();
  return useQuery<GoogleStatus>({
    queryKey: ["google-status"],
    queryFn: async () => {
      const res = await fetch(`${URL}/auth/google/status`, {
        headers: authHeaders(session?.access_token),
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || body?.message || "No se pudo consultar el estado de Gmail");
      }
      return res.json();
    },
    enabled: !!session?.access_token,
    staleTime: 1000 * 60,
  });
}

/** Pide al backend la URL de consentimiento de Google. */
export function useConectarGoogle() {
  const { session } = useAuth();
  return useMutation<{ url: string }, Error, void>({
    mutationFn: async () => {
      if (!session?.access_token) throw new Error("Sesión no válida");
      const res = await fetch(`${URL}/auth/google/url`, {
        headers: authHeaders(session.access_token),
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body?.error || body?.message || "No se pudo iniciar la conexión con Google",
        );
      }
      return res.json();
    },
  });
}

/** Desconecta la cuenta de Gmail del usuario autenticado. */
export function useDesconectarGoogle() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<{ message: string }, Error, void>({
    mutationFn: async () => {
      if (!session?.access_token) throw new Error("Sesión no válida");
      const res = await fetch(`${URL}/auth/google`, {
        method: "DELETE",
        headers: authHeaders(session.access_token),
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || body?.message || "No se pudo desconectar la cuenta");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-status"] });
    },
  });
}
