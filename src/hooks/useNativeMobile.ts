import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Native mobile (Capacitor) integration:
 * - Configures status bar color
 * - Handles Android hardware back button (navigates back, exits app at root)
 * Safe no-op on web.
 */
export function useNativeMobile() {
  const navigate = useNavigate();

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;

        // Status bar — emerald green to match brand
        try {
          const { StatusBar, Style } = await import("@capacitor/status-bar");
          await StatusBar.setBackgroundColor({ color: "#10b981" });
          await StatusBar.setStyle({ style: Style.Light });
        } catch {
          // status-bar plugin not available
        }

        // Android back button → use SPA history; exit when at root
        try {
          const { App } = await import("@capacitor/app");
          const handle = await App.addListener("backButton", ({ canGoBack }) => {
            if (canGoBack && window.history.length > 1) {
              navigate(-1);
            } else {
              App.exitApp();
            }
          });
          cleanup = () => handle.remove();
        } catch {
          // app plugin not available
        }
      } catch {
        // Capacitor not available — running as web
      }
    })();

    return () => cleanup?.();
  }, [navigate]);
}
