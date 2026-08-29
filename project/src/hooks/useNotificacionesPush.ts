import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listarSuscripciones,
  suscribirPush,
  desuscribirPush,
  enviarPushDePruebaFront,
  permisoOtorgado,
  tipoEstadoPermiso,
} from "../lib/push";

export type EstadoPush =
  | "no_soportado"
  | "denegado"
  | "pendiente"
  | "activado"
  | "cargando";

/**
 * Maneja las notificaciones push del dispositivo (PWA):
 * - Estado actual del permiso (soportado / denegado / activado).
 * - Activar / desactivar el dispositivo.
 * - Listar dispositivos suscritos.
 * - Enviar notificación de prueba.
 */
export function useNotificacionesPush() {
  const queryClient = useQueryClient();
  const [accionando, setAccionando] = useState(false);
  const [suscripcionDePrueba, setSuscripcionDePrueba] = useState(false);

  const { data: suscripciones = [], refetch: refetchSuscripciones } = useQuery({
    queryKey: ["push", "suscripciones"],
    queryFn: listarSuscripciones,
    enabled: permisoOtorgado(),
  });

  const tipo = tipoEstadoPermiso();
  const estado: EstadoPush =
    tipo === "no_soportado"
      ? "no_soportado"
      : tipo === "denegado"
        ? "denegado"
        : tipo === "activado"
          ? "activado"
          : "pendiente";

  const activar = useCallback(async () => {
    setAccionando(true);
    try {
      await suscribirPush();
      await refetchSuscripciones();
      queryClient.invalidateQueries({ queryKey: ["push", "suscripciones"] });
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Error activando notificaciones",
      };
    } finally {
      setAccionando(false);
    }
  }, [queryClient, refetchSuscripciones]);

  const desactivar = useCallback(
    async (endpoint: string, desuscribirNavegador = false) => {
      setAccionando(true);
      try {
        await desuscribirPush(endpoint, desuscribirNavegador);
        await refetchSuscripciones();
        queryClient.invalidateQueries({ queryKey: ["push", "suscripciones"] });
        return { ok: true };
      } catch {
        return { ok: false, error: "Error desactivando notificaciones" };
      } finally {
        setAccionando(false);
      }
    },
    [queryClient, refetchSuscripciones]
  );

  const enviarPrueba = useCallback(async () => {
    setSuscripcionDePrueba(true);
    try {
      await enviarPushDePruebaFront();
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Error enviando la prueba",
      };
    } finally {
      setSuscripcionDePrueba(false);
    }
  }, []);

  return {
    estado,
    accionando,
    suscripcionDePrueba,
    suscripciones,
    activar,
    desactivar,
    enviarPrueba,
  };
}
