/**
 * Names of the service worker's runtime caches. Shared between the PWA config
 * in vite.config.ts, which creates them, and the app, which clears the
 * user-specific one on logout. Keep this file free of browser APIs: it is also
 * compiled for Node as part of the Vite config.
 */
export const CALENDAR_FEEDS_CACHE = "calendar-feeds";
export const MAPS_CACHE = "maps";
