import { registerSW } from "virtual:pwa-register";

export function registerServiceWorker() {
  // Enable offline support via PWA service worker
  registerSW({
    onRegisteredSW(swUrl, r) {
      if (r === undefined) return;

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
    },
  });
}
