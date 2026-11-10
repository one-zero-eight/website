import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { build, type Plugin, type ResolvedConfig } from "vite";
import { createBuildLabel } from "./build-labels";
import type {
  BuildInfo,
  BuildManifest,
  BuildResource,
} from "../src/service-worker/protocol";

const manifestFile = "build-manifest.json";

function sha256(source: string) {
  return createHash("sha256").update(source).digest("hex");
}

function createResource(url: string, source: string | Buffer): BuildResource {
  return {
    url,
    integrity: `sha384-${createHash("sha384").update(source).digest("base64")}`,
    size: Buffer.byteLength(source),
  };
}

function sortByUrl(resources: BuildResource[]) {
  return resources.sort((left, right) =>
    left.url < right.url ? -1 : left.url > right.url ? 1 : 0,
  );
}

async function collectResources(
  directory: string,
  infoFile: string,
  root = directory,
): Promise<BuildResource[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const resources: BuildResource[] = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      resources.push(...(await collectResources(path, infoFile, root)));
      continue;
    }
    if (!entry.isFile()) continue;

    const file = relative(root, path).split("\\").join("/");
    // sw.js / manifest are update-control files, not part of an app snapshot.
    // The build-info file is appended after resourcesBuildHash is computed (it embeds that hash).
    if (
      file === "sw.js" ||
      file === manifestFile ||
      file === infoFile ||
      file.endsWith(".map")
    ) {
      continue;
    }

    resources.push(
      createResource(
        `/${file.split("/").map(encodeURIComponent).join("/")}`,
        await readFile(path),
      ),
    );
  }

  return sortByUrl(resources);
}

async function compileWorker(config: ResolvedConfig) {
  const result = await build({
    configFile: false,
    root: config.root,
    publicDir: false,
    envDir: config.envDir,
    mode: config.mode,
    logLevel: config.logLevel === "info" ? "warn" : config.logLevel,
    resolve: { alias: config.resolve.alias },
    build: {
      target: "es2022",
      write: false,
      sourcemap: false,
      minify: true,
      lib: {
        entry: resolve(config.root, "src/service-worker/sw.ts"),
        name: "InNoHassleServiceWorker",
        formats: ["iife"],
        fileName: () => "sw.js",
      },
      rolldownOptions: { output: { codeSplitting: false } },
    },
  });
  if (!Array.isArray(result) && !("output" in result)) {
    throw new Error("The service worker build unexpectedly started a watcher.");
  }
  const output = Array.isArray(result)
    ? result.flatMap((bundle) => bundle.output)
    : result.output;
  const chunk = output[0];
  if (output.length !== 1 || chunk.type !== "chunk" || !chunk.isEntry) {
    throw new Error(
      "The service worker must compile to one self-contained chunk.",
    );
  }
  return chunk.code;
}

export function serviceWorkerBuildPlugin(version: string): Plugin {
  const identity = {
    version,
    buildId: randomUUID(),
    commitHash:
      process.env.GITHUB_SHA ??
      execFileSync("git", ["rev-parse", "HEAD"], {
        encoding: "utf8",
      }).trim(),
    builtAt: new Date().toISOString(),
  };
  let config: ResolvedConfig;
  /**
   * Named per build, so HTML always loads its own metadata: unlike a fixed
   * name, no HTTP cache or CDN can pair it with another build's HTML.
   */
  let infoFile: string;
  let outputWritten = false;
  let buildLabel: Promise<number> | undefined;

  return {
    name: "innohassle-service-worker-build",
    enforce: "post",
    configResolved(resolvedConfig) {
      config = resolvedConfig;
      infoFile = `${config.build.assetsDir}/build-info-${identity.buildId}.js`;
    },
    transformIndexHtml: {
      order: "post",
      async handler(html) {
        const htmlBuildLabel =
          config.command === "build"
            ? await (buildLabel ??= createBuildLabel(
                resolve(
                  config.root,
                  process.env.INNOHASSLE_BUILD_LABEL_HISTORY ??
                    "build-labels.txt",
                ),
                identity.builtAt,
              ))
            : "dev";
        const developmentInfo: BuildInfo = {
          ...identity,
          resourcesBuildHash: sha256(JSON.stringify(identity)),
        };
        return {
          html: html
            .replace("__BUILD_ID__", identity.buildId)
            .replace("__HTML_BUILD_LABEL__", String(htmlBuildLabel))
            .replace("__HTML_BUILD_AT__", identity.builtAt),
          tags: [
            config.command === "serve"
              ? {
                  tag: "script",
                  children: `globalThis.BUILD_INFO = ${JSON.stringify(developmentInfo)};`,
                  injectTo: "head-prepend",
                }
              : {
                  tag: "script",
                  attrs: {
                    src: `/${infoFile}`,
                    // This file contains the final HTML's hash indirectly, so
                    // including its SRI in HTML would create a hash cycle.
                    "skip-sri": true,
                    crossorigin: "anonymous",
                  },
                  injectTo: "head-prepend",
                },
          ],
        };
      },
    },
    writeBundle() {
      outputWritten = true;
    },
    closeBundle: {
      order: "post",
      sequential: true,
      async handler() {
        if (
          config.command !== "build" ||
          !config.build.write ||
          !outputWritten
        ) {
          return;
        }
        outputWritten = false;

        const workerCode = await compileWorker(config);
        const directory = resolve(config.root, config.build.outDir);
        const resources = await collectResources(directory, infoFile);
        // Hash the asset list before writing the build-info file (which embeds that hash).
        const buildInfo: BuildInfo = {
          ...identity,
          resourcesBuildHash: sha256(JSON.stringify(resources)),
        };
        const infoSource = `globalThis.BUILD_INFO = ${JSON.stringify(buildInfo)};\n`;
        await writeFile(join(directory, infoFile), infoSource);
        // Still ship it inside the offline snapshot; it is only excluded from
        // the resourcesBuildHash inputs above.
        const manifest: BuildManifest = {
          schemaVersion: 1,
          buildInfo,
          entrypoint: "/index.html",
          resources: sortByUrl([
            ...resources,
            createResource(`/${infoFile}`, infoSource),
          ]),
        };
        await writeFile(
          join(directory, manifestFile),
          `${JSON.stringify(manifest, null, 2)}\n`,
        );
        // Worker identity is tied only to its standalone code, not app assets.
        // Only serviceWorkerHash is embedded so identical code keeps byte-identical sw.js
        // across app-only deployments (buildId/builtAt must not force SW updates).
        await writeFile(
          join(directory, "sw.js"),
          `globalThis.BUILD_INFO = ${JSON.stringify({ serviceWorkerHash: sha256(workerCode) })};\n${workerCode}`,
        );
      },
    },
  };
}
