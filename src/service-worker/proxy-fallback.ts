/**
 * A mirror host is another domain that proxies the same API, for users whose
 * network cannot reach the original host. Only the host differs, so the mirror
 * answers what the original host would have.
 *
 * The worker decides which of the two a request goes to (see
 * ./worker/api-route.ts). The mirror lives on another site, so it has its own
 * session cookie (see ../api/helpers/mirror-session.ts).
 */

/** "original host=mirror host" pairs, comma-separated. */
export function parseProxyHosts(value: string | undefined) {
  const pairs = (value ?? "")
    .split(",")
    .map((pair) => pair.split("=").map((host) => host.trim()))
    .filter(([from, to]) => from && to && from !== to);
  return new Map(pairs as [string, string][]);
}

/** Built into the worker and the app: the same mirrors for every route. */
const mirrors = parseProxyHosts(import.meta.env.VITE_PROXY_HOSTS);

/** The mirror of a URL, or null when its host has none. */
export function mirrorUrl(url: URL) {
  const mirror = mirrors.get(url.host);
  if (!mirror) return null;
  const mirrored = new URL(url);
  mirrored.host = mirror;
  return mirrored;
}
