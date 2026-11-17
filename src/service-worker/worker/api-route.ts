/**
 * Where a request to an API host with a mirror (see ../proxy-fallback.ts)
 * goes: to the host, or to its mirror when the host can't be reached. A probe
 * decides, and requests then go there without trying the other way first.
 *
 * Waiting for a request to fail is not enough: a blocked host that drops
 * packets leaves fetch pending until the browser gives up (90 s in Firefox),
 * and Firefox cancels a worker's response after about 60 s. Duplicating a
 * silent request on the mirror is not right either: a host that is only busy
 * computing would compute it twice.
 *
 * The probe asks the root of the host for anything at all. Any answer, even
 * an error status, means the host is reachable; the reverse proxy answers it
 * even while the API behind it is busy. It runs:
 * - the first time a host is used (the route is kept in IndexedDB, so a
 *   restarted worker knows it at once);
 * - when a page reports that the network changed;
 * - when a request to the host fails or gets no answer for a second;
 * - in the background, at most once a minute, while the host is routed to
 *   its mirror, to find the way back.
 */
import type { ApiRoute, ApiRoutes } from "@/service-worker/protocol.ts";
import { mirrorUrl } from "@/service-worker/proxy-fallback.ts";
import { readApiRoutes, writeApiRoutes } from "@/service-worker/storage.ts";

/** How long a request waits for its host before the host is probed. */
const silenceTimeout = 1_000;
/** How long a probe waits: a reachable host answers it at once. */
const probeTimeout = 2_000;
/** How often a host routed to its mirror is probed again. */
const recheckInterval = 60_000;

/** Loaded from storage once per worker start, then kept up to date. */
let routes: Promise<ApiRoutes> | null = null;
/** Probes in progress, shared by the requests that wait for them. */
const probes = new Map<string, Promise<ApiRoute>>();

function loadRoutes() {
  routes ??= readApiRoutes().catch(() => ({}));
  return routes;
}

export async function currentApiRoutes(): Promise<ApiRoutes> {
  return { ...(await loadRoutes()) };
}

async function hostAnswers(origin: string) {
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), probeTimeout);
  try {
    // no-cors: the answer itself is not read, so the host needs no CORS headers.
    await fetch(`${origin}/`, {
      mode: "no-cors",
      credentials: "omit",
      cache: "no-store",
      signal: timeout.signal,
    });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Probe the host and remember where its requests go. Never rejects. */
function probe(origin: string) {
  let pending = probes.get(origin);
  if (pending) return pending;
  pending = (async () => {
    const route: ApiRoute = {
      via: (await hostAnswers(origin)) ? "host" : "mirror",
      checkedAt: new Date().toISOString(),
    };
    const known = await loadRoutes();
    known[origin] = route;
    await writeApiRoutes(known).catch(() => undefined);
    return route;
  })().finally(() => probes.delete(origin));
  probes.set(origin, pending);
  return pending;
}

/** The network may have changed: probe every known host again. */
export async function recheckApiRoutes() {
  await Promise.all(Object.keys(await loadRoutes()).map(probe));
}

async function routeOf(origin: string) {
  const known = (await loadRoutes())[origin];
  if (!known) return probe(origin);
  if (
    known.via === "mirror" &&
    Date.now() - Date.parse(known.checkedAt) > recheckInterval
  )
    void probe(origin);
  return known;
}

function mirrorRequest(request: Request, body: ArrayBuffer | null, url: URL) {
  return new Request(url, {
    method: request.method,
    headers: request.headers,
    body: body ?? undefined,
    // The mirror host needs the same cookies as the original one: the
    // session there is its own cross-site cookie.
    credentials: request.credentials,
    cache: request.cache,
    redirect: request.redirect,
    referrer: request.referrer,
    referrerPolicy: request.referrerPolicy,
    integrity: request.integrity,
    signal: request.signal,
  });
}

async function askMirror(
  request: Request,
  body: ArrayBuffer | null,
  mirror: URL,
) {
  let response: Response;
  try {
    response = await fetch(mirrorRequest(request, body, mirror));
  } catch (error) {
    // The network may have changed again: the next requests find out.
    if (!request.signal.aborted) void probe(new URL(request.url).origin);
    throw error;
  }
  // The mirror has no session of this user: Safari blocks its cookie, or it
  // was never copied. That says nothing about the session on the host, and
  // the page would sign the user out, so fail as an unreachable host does.
  if (response.status === 401)
    throw new TypeError("The mirror has no session of this user");
  return response;
}

/**
 * Send the request to its host. When the host stays silent or fails, the
 * probe tells why: a reachable host is waited for (it is busy, or the request
 * failed on its own), an unreachable one never got the request, so it goes to
 * the mirror instead, even with a body.
 */
async function askHost(request: Request, goToMirror: () => Promise<Response>) {
  const origin = new URL(request.url).origin;
  const attempt = new AbortController();
  const abortWithPage = () => attempt.abort();
  request.signal.addEventListener("abort", abortWithPage);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const silence = new Promise<"silent">((resolve) => {
    timer = setTimeout(() => resolve("silent"), silenceTimeout);
  });
  try {
    const direct = fetch(request, { signal: attempt.signal });
    const first = await Promise.race([direct, silence]);
    if (first !== "silent") return first;
    const verdict = await Promise.race([direct, probe(origin)]);
    if (verdict instanceof Response) return verdict;
    if (verdict.via === "host") return await direct;
  } catch (error) {
    // A request the page gave up on must not be sent again.
    if (request.signal.aborted) throw error;
    if ((await probe(origin)).via === "host") throw error;
  } finally {
    clearTimeout(timer);
    request.signal.removeEventListener("abort", abortWithPage);
  }
  // It must not reach the host later, once it went to the mirror.
  attempt.abort();
  return goToMirror();
}

/**
 * fetch, sent to the mirror of its host when the host can't be reached. The
 * answer is the host's own: callers cache and return it as usual.
 */
export async function networkFetch(request: Request) {
  const url = new URL(request.url);
  const mirror = mirrorUrl(url);
  if (!mirror) return fetch(request);
  // The first attempt uses up the body; keep a copy for the mirror.
  const body =
    request.method === "GET" || request.method === "HEAD"
      ? null
      : await request.clone().arrayBuffer();
  const goToMirror = () => askMirror(request, body, mirror);
  if ((await routeOf(url.origin)).via === "mirror") return goToMirror();
  return askHost(request, goToMirror);
}
