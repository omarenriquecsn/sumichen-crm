import { useEffect } from "react";
import { sincronizarSuscripcionExistente } from "../lib/push";

// Evita repetir la sincronización en cada navegación (Layout se monta por página).
let sincronizadoEnEstaCarga = false;

/**
 * Auto-sanación del Web Push: al abrir la app vuelve a guardar en el backend la
 * suscripción push existente de este navegador (si el permiso está otorgado).
 * Recupera endpoints rotados o filas borradas sin pedir nada al usuario.
 * Se ejecuta una sola vez por carga de la app.
 */
export function useSincronizarPush(): void {
  useEffect(() => {
    if (sincronizadoEnEstaCarga) return;
    sincronizadoEnEstaCarga = true;
    void sincronizarSuscripcionExistente();
  }, []);
}
