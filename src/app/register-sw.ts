import { registerSW } from "virtual:pwa-register";
import { repairPoisonedPrecache } from "./sw-cache-repair.ts";

export const appUpdateAvailableEvent = "app-update-available";

export function registerServiceWorker() {
  // Enable offline support via PWA service worker
  const updateServiceWorker = registerSW({
    onNeedRefresh() {
      window.dispatchEvent(
        new CustomEvent(appUpdateAvailableEvent, {
          detail: {
            reload: () => updateServiceWorker(true),
          },
        }),
      );
    },
    onRegisteredSW(swUrl, r) {
      if (r === undefined) return;

      void repairPoisonedPrecache(r);

      // Check for updates periodically
      // https://vite-pwa-org.netlify.app/guide/periodic-sw-updates.html
      async function checkUpdate() {
        if (r === undefined || r.installing || !navigator) return;

        // Do not try to update service worker if offline
        if ("connection" in navigator && !navigator.onLine) return;

        const resp = await fetch(swUrl, {
          cache: "no-store",
          headers: {
            cache: "no-store",
            "cache-control": "no-cache",
          },
        });

        if (resp?.status === 200) await r.update();
      }

      // Check after page load
      checkUpdate();

      // Check every 30 minutes
      setInterval(checkUpdate, 30 * 60 * 1000);

      // Trigger update check on page focus
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          void repairPoisonedPrecache(r);
          void checkUpdate();
        }
      });
    },
  });
}
