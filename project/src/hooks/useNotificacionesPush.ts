import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listarSuscripciones,
  suscribirPush,
  desuscribirPush,
  enviarPushDePruebaFront,
  listarPreferencias,
  guardarPreferencias,
  permisoOtorgado,
  tipoEstadoPermiso,
} from "../lib/push";
import type { PreferenciaNotificacion } from "../lib/push";

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

/**
 * Preferencias de notificación por evento del usuario (cuenta):
 * - `habilitado(evento)` devuelve si el evento está activo (default true).
 * - `guardar(preferencias)` persiste en el backend y refresca la caché.
 */
export function usePreferenciasNotificacion() {
  const queryClient = useQueryClient();
  const [guardando, setGuardando] = useState(false);

  const { data: preferencias = [], refetch: refetchPreferencias } = useQuery<
    PreferenciaNotificacion[]
  >({
    queryKey: ["push", "preferencias"],
    queryFn: listarPreferencias,
  });

  const mapa = useMemo(
    () => new Map(preferencias.map((p) => [p.evento, p.habilitado])),
    [preferencias]
  );

  const habilitado = useCallback(
    (evento: string) => mapa.get(evento) ?? true,
    [mapa]
  );

  const guardar = useCallback(
    async (nuevas: PreferenciaNotificacion[]) => {
      setGuardando(true);
      try {
        await guardarPreferencias(nuevas);
        await refetchPreferencias();
        queryClient.invalidateQueries({ queryKey: ["push", "preferencias"] });
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Error guardando preferencias",
        };
      } finally {
        setGuardando(false);
      }
    },
    [queryClient, refetchPreferencias]
  );

  return { preferencias, habilitado, guardar, guardando };
}
