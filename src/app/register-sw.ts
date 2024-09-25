import { registerSW } from "virtual:pwa-register";

export function registerServiceWorker() {
  // Enable offline support via PWA service worker
  registerSW({
    onRegisteredSW(swUrl, r) {
      if (r === undefined) return;

      // Check for updates periodically
      // https://vite-pwa-org.netlify.app/guide/periodic-sw-updates.html
      setInterval(
        async () => {
          if (r.installing || !navigator) return;

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
        },
        30 * 60 * 1000, // Every 30 minutes
      );
    },
  });
}
