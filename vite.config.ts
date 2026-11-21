import mdx from "@mdx-js/rollup";
import { lingui } from "@lingui/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import remarkGfm from "remark-gfm";
import { defineConfig } from "vite";
import { ViteMinifyPlugin } from "vite-plugin-minify";
import mkcert from "vite-plugin-mkcert";
import { sri } from "vite-plugin-sri3";
import { fileURLToPath, URL } from "node:url";
import { version } from "./package.json";
import { serviceWorkerBuildPlugin } from "./scripts/build-service-worker";

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

    // Lingui catalogs (.po) + native macro transform
    lingui({ macroTransform: true }),

    // Minify the index.html
    ViteMinifyPlugin({}),

    // Subresource Integrity for built JS/CSS in index.html
    sri(),

    // Generate the worker and integrity manifest from final build output.
    serviceWorkerBuildPlugin(version),
  ],

  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              // Keep everything reachable from the app entry in the entry
              // chunk. Groups capture their dependencies recursively, so
              // without this the group below would drag React, the router and
              // other entry modules into the lazy chunk, turning it into a
              // static import of the entry (loaded on every page).
              name: "initial",
              tags: ["$initial"],
              priority: 10,
            },
            {
              // The schedule assistant is one heavy, self-contained section:
              // merge its lazily loaded routes (and the modules only they use)
              // into a single chunk instead of one chunk per route file.
              name: "schedule-assistant",
              test: /[\\/]src[\\/](app[\\/]routes|components|api)[\\/]schedule-assistant[\\/]/,
            },
          ],
        },
      },
    },
  },

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
    alias: [
      {
        find: "@",
        replacement: fileURLToPath(new URL("./src", import.meta.url)),
      },
      {
        // Moment's locale files register on its CommonJS entry, not its ESM entry.
        find: /^moment$/,
        replacement: fileURLToPath(
          new URL("./node_modules/moment/moment.js", import.meta.url),
        ),
      },
    ],
  },
});
