import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/useAuth";

const URL = (import.meta.env.VITE_BACKEND_URL ?? "").toString();

export interface ResumenProyecciones {
  totalFilas: number;
  coincidencias: number;
  actualizados: number;
  sinCambio: number;
  sinCoincidencia: string[];
  sinPermiso: string[];
}

export interface RespuestaProyecciones {
  message: string;
  nombre: string;
  resumen: ResumenProyecciones;
}

/**
 * Sube un Excel (RIF | proyección de venta) a POST /clientes/proyecciones.
 * Cualquier usuario autenticado puede cargarlo; el backend solo actualiza la
 * columna `clientes.proyeccion_venta` (un vendedor únicamente a sus clientes).
 */
export function useSubirProyecciones() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<RespuestaProyecciones, Error, File>({
    mutationFn: async (file: File) => {
      if (!session?.access_token) {
        throw new Error("Debes iniciar sesión para cargar proyecciones");
      }
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${URL}/clientes/proyecciones`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: "include",
        body: formData,
      });

      const texto = await res.text();
      let data: Partial<RespuestaProyecciones> & { error?: string } = {};
      try {
        data = texto ? JSON.parse(texto) : {};
      } catch {
        data = {};
      }

      if (!res.ok) {
        throw new Error(
          data?.error || data?.message || "Error al cargar las proyecciones"
        );
      }

      return data as RespuestaProyecciones;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
    },
  });
}
