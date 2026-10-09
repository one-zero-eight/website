import mdx from "@mdx-js/rollup";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import remarkGfm from "remark-gfm";
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

    // MDX support
    { enforce: "pre", ...mdx({ remarkPlugins: [remarkGfm] }) },

    // React Fast Refresh, including components compiled from MDX
    react({ include: /\.(mdx|js|jsx|ts|tsx)$/ }),

    // Offline mode via PWA
    VitePWA({
      registerType: "prompt",
      workbox: {
        globPatterns: ["**/*.{js,css,html,json,svg,png,woff2}"],
        navigateFallbackDenylist: [/^\/api(?:\/|$)/, /^\/assets\//],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
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
    proxy: {
      "/board-games-api": {
        target: "http://127.0.0.1:8016",
        changeOrigin: true,
        followRedirects: true,
        rewrite: (path) => path.replace(/^\/board-games-api/, ""),
      },
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
