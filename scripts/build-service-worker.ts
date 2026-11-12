import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
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
/** In index.html until the build's files are hashed into its id. */
const buildIdPlaceholder = "__BUILD_ID__";

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
    if (file === "sw.js" || file === manifestFile || file.endsWith(".map")) {
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
        entry: resolve(config.root, "src/service-worker/worker/sw.ts"),
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
  // Recorded only in the manifest: they must not change the built files.
  const commitHash =
    process.env.GITHUB_SHA ??
    execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const builtAt = new Date().toISOString();
  let config: ResolvedConfig;
  let outputWritten = false;
  let buildLabel: Promise<number> | undefined;

  /**
   * Named per build, so HTML always loads its own metadata: unlike a fixed
   * name, no HTTP cache or CDN can pair it with another build's HTML.
   */
  function getInfoFile(buildId: string) {
    return `${config.build.assetsDir}/build-info-${buildId}.js`;
  }

  return {
    name: "innohassle-service-worker-build",
    enforce: "post",
    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },
    transformIndexHtml: {
      order: "post",
      async handler(html) {
        if (config.command === "serve") {
          const developmentInfo: BuildInfo = { version, buildId: "dev" };
          return {
            html: html
              .replace(buildIdPlaceholder, developmentInfo.buildId)
              .replace("__HTML_BUILD_LABEL__", "dev")
              .replace("__HTML_BUILD_AT__", ""),
            tags: [
              {
                tag: "script",
                children: `globalThis.BUILD_INFO = ${JSON.stringify(developmentInfo)};`,
                injectTo: "head-prepend",
              },
            ],
          };
        }
        // A sequential number only for local builds that opt in (pnpm preview,
        // tests): production output must not change just because it was rebuilt.
        const labelHistory = process.env.INNOHASSLE_BUILD_LABEL_HISTORY;
        const htmlBuildLabel = labelHistory
          ? await (buildLabel ??= createBuildLabel(
              resolve(config.root, labelHistory),
              builtAt,
            ))
          : "production";
        return {
          // The build id stays a placeholder until closeBundle has hashed the files.
          html: html
            .replace("__HTML_BUILD_LABEL__", String(htmlBuildLabel))
            .replace("__HTML_BUILD_AT__", labelHistory ? builtAt : ""),
          tags: [
            {
              tag: "script",
              attrs: {
                src: `/${getInfoFile(buildIdPlaceholder)}`,
                // Written after the bundle, so SRI cannot be computed for it.
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
        // Identical code gives identical files, hence the same id. index.html
        // still holds the placeholder here, so the id does not hash itself.
        const buildId = sha256(
          JSON.stringify({
            version,
            resources: await collectResources(directory),
          }),
        ).slice(0, 16);
        const indexFile = join(directory, "index.html");
        await writeFile(
          indexFile,
          (await readFile(indexFile, "utf8")).replaceAll(
            buildIdPlaceholder,
            buildId,
          ),
        );
        const buildInfo: BuildInfo = { version, buildId };
        await writeFile(
          join(directory, getInfoFile(buildId)),
          `globalThis.BUILD_INFO = ${JSON.stringify(buildInfo)};\n`,
        );
        const manifest: BuildManifest = {
          schemaVersion: 1,
          buildInfo,
          commitHash,
          builtAt,
          entrypoint: "/index.html",
          resources: await collectResources(directory),
        };
        await writeFile(
          join(directory, manifestFile),
          `${JSON.stringify(manifest, null, 2)}\n`,
        );
        // Worker identity is tied only to its standalone code, not app assets.
        // Only serviceWorkerHash is embedded so identical code keeps byte-identical
        // sw.js across app-only deployments (an app build must not update the worker).
        await writeFile(
          join(directory, "sw.js"),
          `globalThis.BUILD_INFO = ${JSON.stringify({ serviceWorkerHash: sha256(workerCode) })};\n${workerCode}`,
        );
      },
    },
  };
}
