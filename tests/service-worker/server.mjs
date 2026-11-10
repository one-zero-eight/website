import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";

const root = fileURLToPath(new URL("../../", import.meta.url));
const outputRoot = resolve(root, "node_modules/.cache/service-worker-e2e");
const apiOrigin = "http://127.0.0.1:5202";
const mimeTypes = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

// The worker's separate Vite build must receive the same API origins as the app.
for (const [name, path] of Object.entries({
  ACCOUNTS: "accounts",
  MAPS: "maps",
  SCHEDULE: "schedule",
  EVENTS: "events",
  BOOKING: "booking",
  INNOSPORT: "sport",
  MUSIC_ROOM: "music-room",
})) {
  process.env[`VITE_${name}_API_URL`] = `${apiOrigin}/${path}`;
}
process.env.VITE_CALENDAR_EXPORT_HOST = "127.0.0.1:5202";

// Fixture builds have an isolated counter and must not consume local preview labels.
await mkdir(outputRoot, { recursive: true });
const labelHistoryFile = resolve(outputRoot, "build-labels.txt");
await writeFile(labelHistoryFile, "");
process.env.INNOHASSLE_BUILD_LABEL_HISTORY = labelHistoryFile;

async function buildVersion(version, directory) {
  await build({
    configFile: resolve(root, "vite.config.ts"),
    logLevel: "error",
    build: { outDir: directory, emptyOutDir: true },
    plugins: [
      {
        name: "service-worker-e2e-version",
        enforce: "pre",
        resolveId(id) {
          if (id === "virtual:sw-test-lazy") return "\0sw-test-lazy";
        },
        load(id) {
          if (id === "\0sw-test-lazy") {
            return `globalThis.__SW_TEST_LAZY_VERSION__ = ${JSON.stringify(version)}; export const version = ${JSON.stringify(version)};`;
          }
        },
        transform(source, id) {
          if (id.split("?")[0] !== resolve(root, "src/app/entry-client.tsx"))
            return;
          return `${source}
            globalThis.__SW_TEST_VERSION__ = ${JSON.stringify(version)};
            globalThis.__SW_TEST_LOAD_LAZY__ = () => import("virtual:sw-test-lazy");
            globalThis.__SW_TEST_ADD_NAVIGATION_BLOCKER__ = () => {
              sessionStorage.setItem("sw-test-navigation-blocker-calls", "0");
              router.history.block({
                blockerFn: () => {
                  const key = "sw-test-navigation-blocker-calls";
                  sessionStorage.setItem(key, String(Number(sessionStorage.getItem(key)) + 1));
                  return true;
                },
                enableBeforeUnload: false,
              });
            };
          `;
        },
        transformIndexHtml(html) {
          return html.replace(
            /<html\b/,
            `<html data-sw-test-version="${version}"`,
          );
        },
      },
    ],
  });
  return JSON.parse(
    await readFile(resolve(directory, "build-manifest.json"), "utf8"),
  );
}

const builds = {};
for (const [index, version] of ["a", "b", "c"].entries()) {
  const directory = resolve(outputRoot, version);
  const manifest = await buildVersion(version, directory);
  let lazyResource;
  for (const resource of manifest.resources.filter((item) =>
    item.url.endsWith(".js"),
  )) {
    const source = await readFile(
      resolve(directory, resource.url.slice(1)),
      "utf8",
    );
    if (source.includes("__SW_TEST_LAZY_VERSION__")) {
      lazyResource = resource.url;
      break;
    }
  }
  if (!lazyResource)
    throw new Error(`Build ${version} has no nonessential lazy chunk`);
  builds[version] = { manifest, lazyResource, htmlBuildLabel: index + 1 };
}

// Production rebuilds of A from two commits: identical code must give identical
// files. Production builds are not numbered, so the label history is disabled.
const environment = {
  labelHistory: process.env.INNOHASSLE_BUILD_LABEL_HISTORY,
  commitHash: process.env.GITHUB_SHA,
};
delete process.env.INNOHASSLE_BUILD_LABEL_HISTORY;
const rebuilds = [];
for (const commitHash of ["1".repeat(40), "2".repeat(40)]) {
  process.env.GITHUB_SHA = commitHash;
  rebuilds.push(
    await buildVersion("a", resolve(outputRoot, `a-rebuild-${commitHash[0]}`)),
  );
}
process.env.INNOHASSLE_BUILD_LABEL_HISTORY = environment.labelHistory;
if (environment.commitHash === undefined) delete process.env.GITHUB_SHA;
else process.env.GITHUB_SHA = environment.commitHash;

const defaults = {
  version: "a",
  connectionError: false,
  httpStatus: 200,
  delayResource: false,
  resourceStatus: 200,
  corruptResource: false,
  apiStatus: 200,
  accountStatus: 200,
  accountConnectionError: false,
  delayApi: false,
  runtimeVersion: "a",
  // Like a server without Cache-Control: browsers may then reuse HTML for a while.
  cacheableHtml: false,
};
let state = { ...defaults };
let requests = [];
const resourceWaiters = new Set();
const apiWaiters = new Set();

function release(waiters) {
  for (const resume of waiters) resume();
  waiters.clear();
}

function json(response, value, status = 200) {
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(value));
}

async function control(request, response, pathname) {
  if (pathname === "/__test/builds") {
    json(response, builds);
    return true;
  }
  if (pathname === "/__test/rebuilds") {
    json(response, rebuilds);
    return true;
  }
  if (pathname !== "/__test/state") return false;
  if (request.method === "POST") {
    let body = "";
    for await (const chunk of request) body += chunk;
    const next = JSON.parse(body);
    if (!Object.hasOwn(builds, next.version ?? state.version)) {
      json(response, { error: "Unknown build" }, 400);
      return true;
    }
    state = { ...defaults, ...next };
    if (!state.delayResource) release(resourceWaiters);
    if (!state.delayApi) release(apiWaiters);
    if (next.clearRequests) requests = [];
    response.writeHead(204);
    response.end();
    return true;
  }
  json(response, {
    ...state,
    delayedResources: resourceWaiters.size,
    delayedApis: apiWaiters.size,
    requests,
  });
  return true;
}

const calendar = (revision) =>
  [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//InNoHassle//SW E2E//EN",
    "BEGIN:VEVENT",
    `UID:sw-e2e-${revision}@innohassle.test`,
    "DTSTAMP:20261005T080000Z",
    "DTSTART:20261005T090000Z",
    "DTEND:20261005T103000Z",
    `SUMMARY:Offline algorithms ${revision}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");

const fixtureUser = {
  id: 108,
  email: "sw-test@innopolis.university",
  innohassle_id: "sw-test",
  name: "Service Worker Test",
  favorite_event_groups: ["b24-sw"],
  hidden_event_groups: [],
  linked_calendars: {
    imported: {
      id: 1,
      user_id: 108,
      alias: "imported",
      url: "https://calendar.invalid/private?access_key=never-persist-this",
      name: "Imported calendar",
      is_active: true,
    },
  },
  music_room_hidden: false,
  sports_hidden: false,
  moodle_hidden: false,
  events_hidden: false,
  room_bookings_hidden: false,
  moodle_calendar_authtoken: "never-persist-moodle-token",
};

const apiServer = createServer(async (request, response) => {
  const url = new URL(request.url, apiOrigin);
  response.setHeader(
    "Access-Control-Allow-Origin",
    request.headers.origin ?? "http://127.0.0.1:5201",
  );
  response.setHeader("Vary", "Origin");
  response.setHeader("Access-Control-Allow-Credentials", "true");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.setHeader(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type",
  );
  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }
  requests.push({
    url: url.href,
    authorization: request.headers.authorization ?? null,
    version: state.runtimeVersion,
  });
  if (state.delayApi && url.pathname.endsWith(".ics"))
    await new Promise((resume) => apiWaiters.add(resume));
  // Calendar delays/failures never block the independent account confirmation.
  if (
    state.apiStatus !== 200 &&
    (url.pathname.startsWith("/schedule/") ||
      url.pathname.startsWith("/events/"))
  ) {
    json(response, { detail: "Test schedule API failure" }, state.apiStatus);
    return;
  }
  const revision = state.runtimeVersion;
  if (url.pathname === "/accounts/users/me") {
    if (state.accountConnectionError) {
      request.socket.destroy();
      return;
    }
    if (state.accountStatus !== 200) {
      json(
        response,
        { detail: "Test account confirmation failure" },
        state.accountStatus,
      );
      return;
    }
    const accountId = request.headers.cookie?.match(
      /(?:^|;\s*)sw-e2e-user=(sw-test|sw-other|sw-staff)(?:;|$)/,
    )?.[1];
    if (!accountId) {
      json(response, { detail: "Not authenticated" }, 401);
      return;
    }
    json(response, {
      id: accountId,
      innopolis_info: {
        email: fixtureUser.email,
        name: fixtureUser.name,
        is_student: true,
        is_staff: accountId === "sw-staff",
        is_college: false,
        updated_at: "2026-10-05T08:00:00Z",
      },
      innohassle_admin: false,
      preferences: {},
    });
    return;
  }
  if (url.pathname === "/accounts/tokens/generate-my-token") {
    json(response, { access_token: "never-persist-access-token" });
    return;
  }
  if (url.pathname === "/maps/scenes/") {
    json(response, [
      {
        scene_id: "university",
        title: `University ${revision}`,
        svg_file: "university.svg",
        areas: [],
        geo_reference: null,
      },
      {
        scene_id: "dormitory",
        title: `Dormitory ${revision}`,
        svg_file: "dormitory.svg",
        areas: [],
        geo_reference: null,
      },
    ]);
    return;
  }
  if (url.pathname.startsWith("/maps/scenes/areas/search")) {
    json(response, []);
    return;
  }
  if (
    url.pathname === "/maps/static/university.svg" ||
    url.pathname === "/maps/static/dormitory.svg"
  ) {
    const title = url.pathname.endsWith("dormitory.svg")
      ? "Dormitory"
      : "University";
    response.writeHead(200, {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "no-store",
    });
    response.end(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><title>${title} ${revision}</title><rect width="100" height="100" fill="#eee"/></svg>`,
    );
    return;
  }
  if (
    url.pathname === "/schedule/event-groups/" ||
    url.pathname === "/schedule/event-groups/search"
  ) {
    json(response, {
      event_groups: [
        {
          id: 1,
          alias: "b24-sw",
          name: `B24 ${revision}`,
          path: "Bachelors/2024",
          description: "Algorithms",
          tags: [],
          virtual: false,
        },
      ],
    });
    return;
  }
  if (url.pathname === "/schedule/users/me") {
    json(response, fixtureUser);
    return;
  }
  if (url.pathname === "/schedule/users/me/predefined") {
    json(response, { event_groups: ["b24-sw"] });
    return;
  }
  if (url.pathname === "/schedule/tags/") {
    json(response, { tags: [] });
    return;
  }
  if (url.pathname.endsWith(".ics")) {
    response.writeHead(200, {
      "Content-Type": "text/calendar",
      "Cache-Control": "no-store",
    });
    response.end(calendar(revision));
    return;
  }
  if (url.pathname === "/booking/room/sw-room/bookings") {
    json(response, []);
    return;
  }
  json(response, { detail: `Unmocked API: ${url.pathname}` }, 404);
});

const appServer = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url, "http://127.0.0.1:5201");
    const pathname = decodeURIComponent(requestUrl.pathname);
    if (await control(request, response, pathname)) return;
    const version = state.version;
    const resourceRequest = {
      url: requestUrl.pathname,
      version,
      destination: request.headers["sec-fetch-dest"] ?? null,
      status: null,
      bytes: 0,
    };
    requests.push(resourceRequest);
    response.once("finish", () => {
      resourceRequest.status = response.statusCode;
    });
    if (state.connectionError) {
      request.socket.destroy();
      return;
    }
    if (state.httpStatus !== 200) {
      response.writeHead(state.httpStatus, {
        "Content-Type": "text/plain",
        "Cache-Control": "no-store",
      });
      response.end("Test deployment unavailable");
      return;
    }
    const isDelayedChunk = pathname === builds[version].lazyResource;
    if (isDelayedChunk && state.delayResource)
      await new Promise((resume) => resourceWaiters.add(resume));
    if (response.destroyed) return;
    // A connection can disappear while an already-started resource is delayed.
    if (state.connectionError) {
      request.socket.destroy();
      return;
    }
    if (isDelayedChunk && state.resourceStatus !== 200) {
      response.writeHead(state.resourceStatus);
      response.end("Test resource unavailable");
      return;
    }
    const relativePath =
      pathname === "/" || !pathname.includes(".")
        ? "index.html"
        : pathname.slice(1);
    const versionRoot = resolve(outputRoot, version);
    const filePath = resolve(versionRoot, relativePath);
    if (!filePath.startsWith(`${versionRoot}/`)) {
      response.writeHead(403);
      response.end();
      return;
    }
    // Deliberately read only the selected deployment: old assets must return 404.
    let content = await readFile(filePath);
    if (isDelayedChunk && state.corruptResource)
      content = Buffer.from("/* corrupted deployment chunk */");
    resourceRequest.bytes = content.byteLength;
    response.writeHead(200, {
      "Content-Type":
        mimeTypes[extname(filePath)] ?? "application/octet-stream",
      "Cache-Control":
        state.cacheableHtml && relativePath === "index.html"
          ? "max-age=3600"
          : "no-store",
    });
    response.end(content);
  } catch (error) {
    response.writeHead(error.code === "ENOENT" ? 404 : 500);
    response.end(
      error.code === "ENOENT"
        ? "Not found in current deployment"
        : String(error),
    );
  }
});

await new Promise((ready) => apiServer.listen(5202, "127.0.0.1", ready));
await new Promise((ready) => appServer.listen(5201, "127.0.0.1", ready));
console.info(
  "Service worker E2E: three production deployments ready on 5201; API fixtures on 5202",
);

function handleShutdown() {
  release(resourceWaiters);
  release(apiWaiters);
  appServer.close();
  apiServer.close();
  appServer.closeAllConnections();
  apiServer.closeAllConnections();
}
process.on("SIGTERM", handleShutdown);
process.on("SIGINT", handleShutdown);
