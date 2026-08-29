/**
 * Registra el service worker de la PWA (solo en build de producción).
 * En dev (vite) no se registra para no interferir con el HMR.
 * Requiere HTTPS o localhost (requisito del Service Worker API).
 */
export function registrarServiceWorker(): void {
  if (!("serviceWorker" in navigator)) return;
  if (!import.meta.env.PROD) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.log("✅ Service Worker registrado:", reg.scope);
      })
      .catch((err) => {
        console.error("❌ Error registrando el Service Worker:", err);
      });
  });
}
