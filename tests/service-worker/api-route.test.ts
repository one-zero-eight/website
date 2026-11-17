import type { ApiRoutes } from "@/service-worker/protocol.ts";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

// Read when the module loads: the same build-time env the worker gets.
vi.stubEnv("VITE_PROXY_HOSTS", "api.test=mirror.test");

/** IndexedDB of the worker: survives a restart, unlike the module. */
const storage = vi.hoisted(() => ({ routes: {} as ApiRoutes }));
vi.mock("@/service-worker/storage.ts", () => ({
  readApiRoutes: async () => structuredClone(storage.routes),
  writeApiRoutes: async (routes: ApiRoutes) => {
    storage.routes = structuredClone(routes);
  },
}));

type ApiRoute = typeof import("../../src/service-worker/worker/api-route");
let networkFetch: ApiRoute["networkFetch"];
let recheckApiRoutes: ApiRoute["recheckApiRoutes"];

beforeEach(async () => {
  storage.routes = {};
  vi.useFakeTimers();
  // A fresh worker: what it knows comes from storage only.
  vi.resetModules();
  ({ networkFetch, recheckApiRoutes } =
    await import("../../src/service-worker/worker/api-route"));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const host = "https://api.test";
const minutesAgo = (minutes: number) =>
  new Date(Date.now() - minutes * 60_000).toISOString();

type Behavior = "answers" | "silent" | "refuses" | ((url: URL) => Response);

/**
 * The network as the worker sees it: how each host behaves, and the log of
 * what reached it ("METHOD host/path body"). A silent host never answers,
 * until the request is aborted.
 */
function stubNetwork(behavior: { host: Behavior; mirror: Behavior }) {
  const log: string[] = [];
  const aborted: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(
        input,
        init?.mode === "no-cors" ? { ...init, mode: "cors" } : init,
      );
      const url = new URL(request.url);
      const body = request.body ? ` ${await request.text()}` : "";
      const entry = `${request.method} ${url.host}${url.pathname}${body}`;
      log.push(entry);
      const what = url.host === "mirror.test" ? behavior.mirror : behavior.host;
      if (what === "refuses") throw new TypeError("Failed to fetch");
      if (what === "answers") return new Response(`from ${url.host}`);
      if (what !== "silent") return what(url);
      return new Promise<Response>((_, reject) =>
        request.signal.addEventListener("abort", () => {
          aborted.push(entry);
          reject(new DOMException("Aborted", "AbortError"));
        }),
      );
    }),
  );
  return { log, aborted };
}

async function text(pending: Promise<Response>) {
  return (await pending).text();
}

test("probes a new host once, then sends its requests straight to it", async () => {
  const { log } = stubNetwork({ host: "answers", mirror: "answers" });

  expect(await text(networkFetch(new Request(`${host}/users/me`)))).toBe(
    "from api.test",
  );
  expect(await text(networkFetch(new Request(`${host}/feed.ics`)))).toBe(
    "from api.test",
  );

  expect(log).toEqual([
    "GET api.test/",
    "GET api.test/users/me",
    "GET api.test/feed.ics",
  ]);
  expect(storage.routes[host]).toMatchObject({ via: "host" });
});

test("sends every request straight to the mirror once the probe finds the host unreachable", async () => {
  const { log } = stubNetwork({ host: "silent", mirror: "answers" });

  const first = networkFetch(new Request(`${host}/users/me`));
  await vi.advanceTimersByTimeAsync(2_000);
  expect(await text(first)).toBe("from mirror.test");
  const post = networkFetch(
    new Request(`${host}/echo`, { method: "POST", body: "once" }),
  );

  expect(await text(post)).toBe("from mirror.test");
  expect(log).toEqual([
    "GET api.test/",
    "GET mirror.test/users/me",
    "POST mirror.test/echo once",
  ]);
});

test("a restarted worker remembers that the host is unreachable", async () => {
  storage.routes = { [host]: { via: "mirror", checkedAt: minutesAgo(0) } };
  const { log } = stubNetwork({ host: "silent", mirror: "answers" });

  expect(await text(networkFetch(new Request(`${host}/users/me`)))).toBe(
    "from mirror.test",
  );
  expect(log).toEqual(["GET mirror.test/users/me"]);
});

test("waits for a host that is busy computing instead of asking the mirror", async () => {
  storage.routes = { [host]: { via: "host", checkedAt: minutesAgo(0) } };
  const { log } = stubNetwork({
    host: "answers",
    mirror: "answers",
  });
  const answersLate = vi.mocked(fetch).getMockImplementation()!;
  vi.mocked(fetch).mockImplementation(async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.pathname === "/report")
      await new Promise((resolve) => setTimeout(resolve, 30_000));
    return answersLate(input, init);
  });

  const report = networkFetch(new Request(`${host}/report`));
  await vi.advanceTimersByTimeAsync(30_000);

  expect(await text(report)).toBe("from api.test");
  // The probe answered at once, so the report was computed only once.
  expect(log).toEqual(["GET api.test/", "GET api.test/report"]);
});

test("moves a request to the mirror once its silent host turns out unreachable, so a POST is sent once", async () => {
  storage.routes = { [host]: { via: "host", checkedAt: minutesAgo(0) } };
  const { log, aborted } = stubNetwork({ host: "silent", mirror: "answers" });

  const post = networkFetch(
    new Request(`${host}/echo`, { method: "POST", body: "once" }),
  );
  await vi.advanceTimersByTimeAsync(1_000 + 2_000);

  expect(await text(post)).toBe("from mirror.test");
  expect(log).toEqual([
    "POST api.test/echo once",
    "GET api.test/",
    "POST mirror.test/echo once",
  ]);
  // Cancelled, so it can't reach the host once the network lets it through.
  expect(aborted).toContain("POST api.test/echo once");
  expect(storage.routes[host]).toMatchObject({ via: "mirror" });
});

test("a refused request goes to the mirror only if the probe can't reach the host either", async () => {
  storage.routes = { [host]: { via: "host", checkedAt: minutesAgo(0) } };
  stubNetwork({ host: "refuses", mirror: "answers" });
  expect(await text(networkFetch(new Request(`${host}/users/me`)))).toBe(
    "from mirror.test",
  );

  // Reachable, but this request failed on its own (CORS, for example).
  storage.routes = { [host]: { via: "host", checkedAt: minutesAgo(0) } };
  vi.resetModules();
  ({ networkFetch } =
    await import("../../src/service-worker/worker/api-route"));
  stubNetwork({
    host: (url) => {
      if (url.pathname === "/") return new Response("root");
      throw new TypeError("Failed to fetch");
    },
    mirror: "answers",
  });
  await expect(networkFetch(new Request(`${host}/users/me`))).rejects.toThrow(
    "Failed to fetch",
  );
});

test("looks for the way back to the host at most once a minute", async () => {
  storage.routes = { [host]: { via: "mirror", checkedAt: minutesAgo(2) } };
  const { log } = stubNetwork({ host: "answers", mirror: "answers" });

  // Still the mirror: the probe runs in the background.
  expect(await text(networkFetch(new Request(`${host}/a`)))).toBe(
    "from mirror.test",
  );
  await vi.advanceTimersByTimeAsync(0);
  expect(await text(networkFetch(new Request(`${host}/b`)))).toBe(
    "from api.test",
  );

  expect(log).toEqual(["GET api.test/", "GET mirror.test/a", "GET api.test/b"]);
});

test("probes the known hosts again when the network changes", async () => {
  storage.routes = { [host]: { via: "mirror", checkedAt: minutesAgo(0) } };
  stubNetwork({ host: "answers", mirror: "answers" });

  await recheckApiRoutes();

  expect(storage.routes[host]).toMatchObject({ via: "host" });
  expect(await text(networkFetch(new Request(`${host}/users/me`)))).toBe(
    "from api.test",
  );
});

test("the mirror's 401 fails like an unreachable host, so the page does not sign the user out", async () => {
  storage.routes = { [host]: { via: "mirror", checkedAt: minutesAgo(0) } };
  stubNetwork({
    host: "silent",
    mirror: () => new Response("Not authenticated", { status: 401 }),
  });

  await expect(
    networkFetch(new Request(`${host}/users/me`)),
  ).rejects.toBeInstanceOf(TypeError);
});

test("does not resend a request the page gave up on", async () => {
  storage.routes = { [host]: { via: "host", checkedAt: minutesAgo(0) } };
  const { log } = stubNetwork({ host: "refuses", mirror: "answers" });
  const controller = new AbortController();
  controller.abort();

  await expect(
    networkFetch(
      new Request(`${host}/echo`, {
        method: "POST",
        body: "abandoned",
        signal: controller.signal,
      }),
    ),
  ).rejects.toThrow();
  expect(log.filter((entry) => entry.includes("mirror"))).toEqual([]);
});

test("leaves a host without a mirror alone", async () => {
  const { log } = stubNetwork({ host: "refuses", mirror: "answers" });

  await expect(
    networkFetch(new Request("https://unknown.test/users/me")),
  ).rejects.toThrow("Failed to fetch");
  expect(log).toEqual(["GET unknown.test/users/me"]);
});
