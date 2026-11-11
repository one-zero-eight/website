/**
 * API responses kept for instant loads and offline use (calendar, maps,
 * account). Only these GET requests are cached; other API calls pass through.
 *
 * - User data: network first. A changed timetable must win whenever there is
 *   a connection; the cached copy is used offline or when the network is
 *   slower than networkTimeout. The page deletes this cache on logout.
 * - Maps: rarely change, so the cached copy is served at once and refreshed
 *   in the background for the next visit.
 */
import { mapsCacheName, userDataCacheName } from "./protocol.ts";
import { networkFetch } from "./proxy-fallback.ts";
import { inspectWorkerState } from "./storage.ts";

/** Per cache; the least recently saved entries are evicted first. */
const maxEntries = 128;
const networkTimeout = 3_000;

/** Path after an API base URL from the build environment, or null for another API. */
function apiPath(url: URL, base: string | undefined) {
  const path = url.origin + url.pathname;
  return base && path.startsWith(`${base}/`) ? path.slice(base.length) : null;
}

function selectCache(url: URL) {
  const schedule = apiPath(url, import.meta.env.VITE_SCHEDULE_API_URL) ?? "";
  const when2meet = apiPath(url, import.meta.env.VITE_WHEN2MEET_API_URL) ?? "";
  const maps = apiPath(url, import.meta.env.VITE_MAPS_API_URL) ?? "";
  const accounts = apiPath(url, import.meta.env.VITE_ACCOUNTS_API_URL);
  if (
    // Calendar feeds, including external calendars proxied by the schedule API.
    url.pathname.endsWith(".ics") ||
    schedule === "/me/check-calendar-url-to-link" ||
    // The calendar builds its list of feeds from these; offline it needs them too.
    ["/users/me", "/users/me/predefined", "/event-groups/"].includes(
      schedule,
    ) ||
    ["/meetings/", "/meetings/participating"].includes(when2meet) ||
    // Account data, but never access tokens.
    (accounts !== null && !accounts.startsWith("/tokens/"))
  )
    return userDataCacheName;
  if (
    maps === "/scenes" ||
    maps === "/scenes/" ||
    /^\/static\/.+\.svg$/.test(maps)
  )
    return mapsCacheName;
  return null;
}

/** Unlike caches.open, matching never recreates a cache that a reset deleted. */
function readCached(request: Request, cacheName: string) {
  return caches.match(request, { cacheName });
}

async function store(request: Request, response: Response, cacheName: string) {
  // Under the storage lock, so a reset cannot be followed by a late write.
  await inspectWorkerState(async (state) => {
    if (state.blocked) return;
    const cache = await caches.open(cacheName);
    await cache.put(request, response);
    // Keys are in insertion order, and put moves an entry to the end.
    const keys = await cache.keys();
    for (const key of keys.slice(0, -maxEntries)) await cache.delete(key);
  });
}

/** Fetch (through the mirror of the host, if any), and store successful responses. */
function fetchAndStore(event: FetchEvent, cacheName: string) {
  const network = networkFetch(event.request);
  // This reaction runs first, so the clone is taken before the page reads the body.
  const stored = network.then((response) =>
    response.status === 200
      ? store(event.request, response.clone(), cacheName)
      : undefined,
  );
  event.waitUntil(stored.catch(() => undefined));
  return network;
}

async function networkFirst(event: FetchEvent, cacheName: string) {
  const network = fetchAndStore(event, cacheName);
  const timedOut = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), networkTimeout),
  );
  const response = await Promise.race([network, timedOut]).catch(() => null);
  if (response) return response;
  return (await readCached(event.request, cacheName)) ?? network;
}

async function staleWhileRevalidate(event: FetchEvent, cacheName: string) {
  const network = fetchAndStore(event, cacheName);
  return (await readCached(event.request, cacheName)) ?? network;
}

/** Cache a GET, if it belongs to a cache. Returns whether the request was answered. */
export function handleApiCacheFetch(event: FetchEvent) {
  if (event.request.method !== "GET") return false;
  const cacheName = selectCache(new URL(event.request.url));
  if (cacheName === userDataCacheName) {
    event.respondWith(networkFirst(event, cacheName));
    return true;
  }
  if (cacheName === mapsCacheName) {
    event.respondWith(staleWhileRevalidate(event, cacheName));
    return true;
  }
  return false;
}
