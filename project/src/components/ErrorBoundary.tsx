import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  mensaje?: string;
}

/**
 * ErrorBoundary global: si la app lanza un error de render (p. ej. por un
 * bundle/caché antiguo del service worker), muestra un mensaje con acciones de
 * recuperación en vez de una pantalla en blanco.
 *
 * El botón "Reparar y recargar" desregistra los service workers y borra todas
 * las cachés del sitio antes de recargar, lo que repara clientes que quedaron
 * con assets viejos sin que el usuario tenga que limpiar los datos del navegador.
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, mensaje: error?.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("ErrorBoundary:", error, info);
  }

  private reparar = async (): Promise<void> => {
    try {
      if ("serviceWorker" in navigator) {
        const registros = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registros.map((r) => r.unregister()));
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch (e) {
      console.error("Error reparando caché/service worker:", e);
    } finally {
      window.location.reload();
    }
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-lg font-semibold text-gray-900">
              Ocurrió un error al cargar la aplicación
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Puede deberse a datos antiguos guardados en el navegador. Usa
              "Reparar y recargar" para solucionarlo.
            </p>
            {this.state.mensaje && (
              <p className="mt-3 break-words rounded-lg bg-gray-50 px-3 py-2 text-left text-xs text-gray-400">
                {this.state.mensaje}
              </p>
            )}
            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={this.reparar}
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-blue-700"
              >
                Reparar y recargar
              </button>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center justify-center rounded-lg bg-gray-100 px-4 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-200"
              >
                Solo recargar
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
