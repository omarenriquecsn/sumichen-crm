import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Tipos del evento beforeinstallprompt (no tipado en TS DOM).
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function esIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isIPadOS =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return /iPad|iPhone|iPod/.test(ua) || isIPadOS;
}

function estaEnModoStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone = (navigator as unknown as { standalone?: boolean })
    ?.standalone;
  return mq || iosStandalone === true;
}

/**
 * Estado de instalación de la PWA.
 *
 * - `disponible`: la app es instalable y NO está instalada (solo entonces se
 *   muestra el botón "Instalar app"). En iOS no existe `beforeinstallprompt`,
 *   así que se ofrece el botón (con instrucciones) mientras no esté instalada.
 * - `instalado`: la app ya corre como PWA instalada (botón oculto).
 */
export function useInstalarApp() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [instalado, setInstalado] = useState<boolean>(estaEnModoStandalone);
  const [puedeInstalar, setPuedeInstalar] = useState<boolean>(false);
  const promptEventRef = useRef<BeforeInstallPromptEvent | null>(null);
  const dispositivoIOS = esIOS();

  useEffect(() => {
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      promptEventRef.current = promptEvent;
      setDeferredPrompt(promptEvent);
      setPuedeInstalar(true);
    };

    const onAppInstalled = () => {
      setInstalado(true);
      setDeferredPrompt(null);
      setPuedeInstalar(false);
      promptEventRef.current = null;
    };

    const mq = window.matchMedia("(display-mode: standalone)");
    const onChangeDisplayMode = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setInstalado(true);
        setPuedeInstalar(false);
        setDeferredPrompt(null);
        promptEventRef.current = null;
      }
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    mq.addEventListener?.("change", onChangeDisplayMode);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      mq.removeEventListener?.("change", onChangeDisplayMode);
    };
  }, []);

  // En iOS no hay beforeinstallprompt: si no está instalada, se muestra el
  // botón para guiar al usuario (instalación manual desde Safari).
  const disponible = !instalado && (puedeInstalar || dispositivoIOS);

  const instalar = useCallback(
    async (): Promise<{ resultado: string; platform?: string }> => {
      const event = promptEventRef.current || deferredPrompt;
      if (event) {
        setPuedeInstalar(false);
        await event.prompt();
        const choice = await event.userChoice;
        if (choice.outcome === "accepted") {
          setInstalado(true);
          setDeferredPrompt(null);
          promptEventRef.current = null;
        }
        return { resultado: choice.outcome, platform: choice.platform };
      }
      if (dispositivoIOS) {
        // iOS: instalación manual (Añadir a pantalla de inicio).
        return { resultado: "instrucciones", platform: "ios" };
      }
      return { resultado: "no_disponible" };
    },
    [deferredPrompt, dispositivoIOS]
  );

  return { disponible, instalado, puedeInstalar, esIOS: dispositivoIOS, instalar };
}
