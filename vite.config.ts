import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { ViteMinifyPlugin } from "vite-plugin-minify";
import { VitePWA } from "vite-plugin-pwa";
import tsconfigPaths from "vite-tsconfig-paths";
import { version } from "./package.json";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    // Enable routing via TanStack Router
    TanStackRouterVite({
      routesDirectory: "src/app/routes",
      generatedRouteTree: "src/app/route-tree.gen.ts",
      quoteStyle: "double",
      semicolons: true,
    }),

    // React support
    viteReact(),

    // Resolve paths from tsconfig.json
    tsconfigPaths(),

    // Offline mode via PWA
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ["**/*.{js,css,html,json,svg,png,woff2}"],
      },
      manifest: false, // Manifest is already in public/manifest.json
    }),

    // Minify the index.html
    ViteMinifyPlugin({}),
  ],

  define: {
    // Inject the app version variable
    __VERSION__: JSON.stringify(version),
  },
});
