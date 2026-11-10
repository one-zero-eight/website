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

async function collectResources(
  directory: string,
  root = directory,
): Promise<BuildResource[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const resources: BuildResource[] = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      resources.push(...(await collectResources(path, root)));
      continue;
    }
    if (!entry.isFile()) continue;

    const file = relative(root, path).split("\\").join("/");
    // sw.js / manifest are update-control files, not part of an app snapshot.
    // build-info.js is appended after resourcesBuildHash is computed (it embeds that hash).
    if (
      file === "sw.js" ||
      file === manifestFile ||
      file === "build-info.js" ||
      file.endsWith(".map")
    ) {
      continue;
    }

    const source = await readFile(path);
    resources.push({
      url: `/${file.split("/").map(encodeURIComponent).join("/")}`,
      integrity: `sha384-${createHash("sha384").update(source).digest("base64")}`,
      size: source.byteLength,
    });
  }

  return resources.sort((left, right) =>
    left.url < right.url ? -1 : left.url > right.url ? 1 : 0,
  );
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
  const infoFile = "build-info.js";
  let config: ResolvedConfig;
  let outputWritten = false;
  let buildLabel: Promise<number> | undefined;

  return {
    name: "innohassle-service-worker-build",
    enforce: "post",
    configResolved(resolvedConfig) {
      config = resolvedConfig;
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
        const resources = await collectResources(directory);
        // Hash the asset list before injecting build-info.js (which embeds that hash).
        const buildInfo: BuildInfo = {
          ...identity,
          resourcesBuildHash: sha256(JSON.stringify(resources)),
        };
        // Guard rejects a cached HTML shell paired with a mismatched build-info.js.
        const infoSource = `if (document.documentElement.dataset.buildId !== ${JSON.stringify(buildInfo.buildId)}) throw new Error("Build metadata does not match this document"); globalThis.BUILD_INFO = ${JSON.stringify(buildInfo)};\n`;
        await writeFile(join(directory, infoFile), infoSource);
        // Still ship build-info.js inside the offline snapshot so navigations
        // can verify integrity; it is just excluded from resourcesBuildHash inputs above.
        resources.push({
          url: `/${infoFile}`,
          integrity: `sha384-${createHash("sha384").update(infoSource).digest("base64")}`,
          size: Buffer.byteLength(infoSource),
        });
        resources.sort((left, right) =>
          left.url < right.url ? -1 : left.url > right.url ? 1 : 0,
        );

        const manifest: BuildManifest = {
          schemaVersion: 1,
          buildInfo,
          entrypoint: "/index.html",
          resources,
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
