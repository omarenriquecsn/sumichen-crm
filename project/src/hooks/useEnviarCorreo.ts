import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/useAuth";

const URL = (import.meta.env.VITE_BACKEND_URL ?? "").toString();

export interface EnviarCorreoArgs {
  to: string;
  asunto: string;
  cuerpo: string;
  adjuntos?: File[];
}

/**
 * Envía un correo al cliente vía el backend (Resend). El servidor construye el
 * `from` con el perfil del vendedor autenticado y añade su firma al pie.
 */
export function useEnviarCorreo() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<{ message: string; id?: string }, Error, EnviarCorreoArgs>({
    mutationFn: async ({ to, asunto, cuerpo, adjuntos = [] }) => {
      if (!session?.access_token) throw new Error("Sin token");
      const formData = new FormData();
      formData.append("to", to);
      formData.append("asunto", asunto);
      formData.append("cuerpo", cuerpo);
      for (const file of adjuntos) {
        formData.append("adjuntos", file);
      }
      const res = await fetch(`${URL}/correos/enviar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        credentials: "include",
        body: formData,
      });
      if (!res.ok) {
        let mensaje = "Error al enviar el correo";
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
      queryClient.invalidateQueries({ queryKey: ["actividades"] });
    },
  });
}
