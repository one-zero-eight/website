import tailwindcss from "@tailwindcss/vite";
// @ts-expect-error The plugin is not typed
import veauryVitePlugins from "veaury/vite/esm/index.mjs";
import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  root: fileURLToPath(new URL("./e2e/tiptap/fixture", import.meta.url)),
  plugins: [tailwindcss(), veauryVitePlugins({ type: "react" })],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5199,
    strictPort: true,
  },
});
