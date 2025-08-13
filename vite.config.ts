import mdx from "@mdx-js/rollup";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import remarkGfm from "remark-gfm";
// @ts-expect-error The plugin is not typed
import veauryVitePlugins from "veaury/vite/esm/index.mjs";
import { defineConfig } from "vite";
import { ViteMinifyPlugin } from "vite-plugin-minify";
import mkcert from "vite-plugin-mkcert";
import { VitePWA } from "vite-plugin-pwa";
import tsconfigPaths from "vite-tsconfig-paths";
import { version } from "./package.json";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    // HTTPS support in development
    mkcert({
      hosts: ["local.innohassle.ru"],
    }),

    // Enable routing via TanStack Router
    TanStackRouterVite({
      routesDirectory: "src/app/routes",
      generatedRouteTree: "src/app/route-tree.gen.ts",
      quoteStyle: "double",
      semicolons: true,
    }),

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

  css: {
    preprocessorOptions: {
      scss: {
        api: "modern-compiler",
      },
    },
  },

  define: {
    // Inject the app version variable
    __VERSION__: JSON.stringify(version),
  },
});
