import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const SITE_URL = "https://innohassle.ru";
const ROUTE_TREE_PATH = resolve(process.cwd(), "src/app/route-tree.gen.ts");
const OUTPUT_PATH = resolve(process.cwd(), "public/sitemap.xml");

function parseArguments(args) {
  const excludedPaths = new Set();

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === "--exclude") {
      const value = args[index + 1];

      if (!value) {
        throw new Error("Expected a value after --exclude");
      }

      for (const item of value.split(",")) {
        const rawPath = item.trim();
        const path = rawPath.endsWith("/") ? rawPath : normalizePath(rawPath);

        if (path) {
          excludedPaths.add(path);
        }
      }

      index += 1;
      continue;
    }

    if (argument.startsWith("--exclude=")) {
      const value = argument.slice("--exclude=".length);

      for (const item of value.split(",")) {
        const rawPath = item.trim();
        const path = rawPath.endsWith("/") ? rawPath : normalizePath(rawPath);

        if (path) {
          excludedPaths.add(path);
        }
      }
    }
  }

  return {
    excludedPaths,
  };
}

function normalizePath(path) {
  if (path === "/") {
    return "/";
  }

  return path.endsWith("/") ? path.slice(0, -1) : path;
}

function isStaticRoute(path) {
  return !path.includes("$") && !path.includes("[") && !path.includes("]");
}

function parseFullPaths(routeTreeSource) {
  const interfaceMatch = routeTreeSource.match(
    /export interface FileRoutesByFullPath\s*\{([\s\S]*?)\n\}/,
  );

  if (!interfaceMatch) {
    throw new Error("Failed to find FileRoutesByFullPath in route-tree.gen.ts");
  }

  const block = interfaceMatch[1];
  const routeMatches = [...block.matchAll(/"([^"]+)":/g)];
  const uniquePaths = new Set();

  for (const [, rawPath] of routeMatches) {
    const normalizedPath = normalizePath(rawPath);

    if (isStaticRoute(normalizedPath)) {
      uniquePaths.add(normalizedPath);
    }
  }

  return [...uniquePaths].sort((a, b) => a.localeCompare(b));
}

function shouldExcludeRoute(route, excludedPaths) {
  for (const excludedPath of excludedPaths) {
    if (excludedPath.endsWith("/")) {
      const normalizedPrefix = excludedPath.slice(0, -1);

      if (!normalizedPrefix) {
        continue;
      }

      if (route.startsWith(`${normalizedPrefix}/`)) {
        return true;
      }

      continue;
    }

    if (route === excludedPath) {
      return true;
    }
  }

  return false;
}

function buildXml(routes) {
  const urls = routes
    .map((route) => {
      const location = route === "/" ? SITE_URL : `${SITE_URL}${route}`;
      const priority = route === "/" ? "1.0" : "0.5";

      return [
        "  <url>",
        `    <loc>${location}</loc>`,
        "    <changefreq>weekly</changefreq>",
        `    <priority>${priority}</priority>`,
        "  </url>",
      ].join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    "</urlset>",
    "",
  ].join("\n");
}

async function main() {
  const { excludedPaths } = parseArguments(process.argv.slice(2));
  const routeTreeSource = await readFile(ROUTE_TREE_PATH, "utf8");
  const routes = parseFullPaths(routeTreeSource).filter(
    (route) => !shouldExcludeRoute(route, excludedPaths),
  );
  const xml = buildXml(routes);

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, xml, "utf8");

  console.log(
    `Generated sitemap with ${routes.length} routes at public/sitemap.xml`,
  );

  if (excludedPaths.size > 0) {
    console.log(`Excluded ${excludedPaths.size} path(s): ${[...excludedPaths].join(", ")}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
