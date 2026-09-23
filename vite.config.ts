import mdx from "@mdx-js/rollup";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import remarkGfm from "remark-gfm";
// @ts-expect-error The plugin is not typed
import veauryVitePlugins from "veaury/vite/esm/index.mjs";
import { defineConfig } from "vite";
import { ViteMinifyPlugin } from "vite-plugin-minify";
import mkcert from "vite-plugin-mkcert";
import { VitePWA } from "vite-plugin-pwa";
import { sri } from "vite-plugin-sri3";
import { fileURLToPath, URL } from "node:url";
import { version } from "./package.json";
import {
  CALENDAR_FEEDS_CACHE,
  MAPS_CACHE,
} from "./src/app/sw-runtime-caches.ts";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    // HTTPS support in development
    mkcert({
      hosts: ["local.innohassle.ru"],
    }),

    // Enable routing via TanStack Router
    tanstackRouter({
      routesDirectory: "src/app/routes",
      generatedRouteTree: "src/app/route-tree.gen.ts",
      quoteStyle: "double",
      semicolons: true,
    }),

    // TailwindCSS support
    tailwindcss(),

    // Support for React and Vue in one project
    veauryVitePlugins({
      type: "react",
      // Configuration of @vitejs/plugin-react
      // reactOptions: {...},
      // Configuration of @vitejs/plugin-vue
      // vueOptions: {...},
      // Configuration of @vitejs/plugin-vue-jsx
      // vueJsxOptions: {...}
    }),

    // MDX support
    mdx({
      remarkPlugins: [remarkGfm],
    }),

    // Offline mode via PWA
    VitePWA({
      registerType: "prompt",
      workbox: {
        globPatterns: ["**/*.{js,css,html,json,svg,png,woff2}"],
        navigateFallbackDenylist: [/^\/api(?:\/|$)/, /^\/assets\//],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
        // API responses kept for instant loads and offline use. The matchers
        // are serialized into the service worker, so they must not reference
        // anything outside themselves; they check the path only, so they work
        // with any API host from the env.
        runtimeCaching: [
          {
            // Calendar feeds (.ics, and external calendars proxied through
            // check-calendar-url-to-link). Network first: a changed timetable
            // must win whenever there is a connection; the cached copy is used
            // offline or when the network is slower than the timeout.
            urlPattern: ({ url }) =>
              url.pathname.endsWith(".ics") ||
              url.pathname.endsWith("/check-calendar-url-to-link"),
            handler: "NetworkFirst",
            options: {
              cacheName: CALENDAR_FEEDS_CACHE,
              networkTimeoutSeconds: 3,
              cacheableResponse: { statuses: [200] },
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },
          {
            // Maps: the scene list and the floor plan SVGs. They rarely
            // change, so serve the cached copy at once and refresh it in the
            // background for the next visit.
            urlPattern: ({ url }) =>
              /\/maps\/v\d+\/(scenes\/?|static\/.+\.svg)$/.test(url.pathname),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: MAPS_CACHE,
              cacheableResponse: { statuses: [200] },
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },
        ],
      },
      manifest: false, // Manifest is already in public/manifest.json
      includeManifestIcons: true,
      includeAssets: "*",
    }),

    // Minify the index.html
    ViteMinifyPlugin({}),

    // Subresource Integrity for built JS/CSS in index.html
    sri(),
  ],

  server: {
    hmr: {
      host: "local.innohassle.ru",
    },
  },

  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },

  define: {
    // Inject the app version variable
    __VERSION__: JSON.stringify(version),
  },
});
