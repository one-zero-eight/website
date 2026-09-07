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
      registerType: "autoUpdate",
      workbox: {
        globPatterns: ["**/*.{js,css,json,svg,png,woff2}"],
        navigateFallback: null,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "html-pages",
              cacheableResponse: { statuses: [200] },
              matchOptions: { ignoreSearch: true },
              expiration: {
                maxEntries: 32,
                maxAgeSeconds: 7 * 24 * 60 * 60,
              },
            },
          },
          {
            urlPattern: ({ url }) =>
              url.pathname.endsWith(".ics") ||
              url.pathname.includes("check-calendar-url-to-link"),
            handler: "NetworkFirst",
            options: {
              cacheName: "ics-feeds",
              cacheableResponse: { statuses: [200] },
              expiration: {
                maxEntries: 64,
                maxAgeSeconds: 7 * 24 * 60 * 60,
              },
            },
          },
          {
            urlPattern: ({ url }) =>
              url.pathname.includes("/static/") && url.pathname.endsWith(".svg"),
            handler: "NetworkFirst",
            options: {
              cacheName: "map-svgs",
              cacheableResponse: { statuses: [200] },
              expiration: {
                maxEntries: 64,
                maxAgeSeconds: 7 * 24 * 60 * 60,
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
