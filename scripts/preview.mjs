import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { build, preview } from "vite";

const { values } = parseArgs({
  options: {
    port: { type: "string", default: "3000" },
    host: { type: "string", default: "0.0.0.0" },
    outDir: { type: "string", default: "dist" },
  },
});
const port = Number(values.port);
if (!Number.isInteger(port) || port < 3000 || port > 3099) {
  throw new Error("Preview port must be an integer between 3000 and 3099.");
}
const root = fileURLToPath(new URL("../", import.meta.url));
const outDir = resolve(root, values.outDir);

console.info("[preview] Building the application...");
await build({ root, logLevel: "error", build: { outDir } });
const server = await preview({
  root,
  build: { outDir },
  preview: { port, host: values.host, strictPort: true },
});
server.printUrls();

async function handleShutdown() {
  await server.close();
  process.exit(0);
}
process.once("SIGINT", handleShutdown);
process.once("SIGTERM", handleShutdown);
