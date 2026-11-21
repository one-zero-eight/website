/**
 * A mirror host is another domain that proxies the same API, for users whose
 * network cannot reach the original host: such a block rejects `fetch` with a
 * TypeError, without a status. The retry keeps the method, the path and the
 * whole request, and only the host differs, so the answer is the one the
 * original host would have given.
 *
 * The mirror lives on another site, so it has its own session cookie (see
 * ./page/mirror-session.ts); everything else about a request stays the same.
 */

/** "original host=mirror host" pairs, comma-separated. */
export function parseProxyHosts(value: string | undefined) {
  const pairs = (value ?? "")
    .split(",")
    .map((pair) => pair.split("=").map((host) => host.trim()))
    .filter(([from, to]) => from && to && from !== to);
  return new Map(pairs as [string, string][]);
}

/** Built into the worker: the same fallback for every route. */
const mirrors = parseProxyHosts(import.meta.env.VITE_PROXY_HOSTS);

/** The mirror of a URL, or null when its host has none. */
export function mirrorUrl(url: URL) {
  const mirror = mirrors.get(url.host);
  if (!mirror) return null;
  const mirrored = new URL(url);
  mirrored.host = mirror;
  return mirrored;
}

async function requestThroughMirror(
  request: Request,
  body: ArrayBuffer | null,
  mirror: URL,
) {
  return fetch(
    new Request(mirror, {
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
    }),
  );
}

/**
 * fetch, answered by the mirror of its host when that host cannot be reached.
 * The answer is the host's own: callers cache and return it as usual.
 */
export async function networkFetch(request: Request) {
  const mirror = mirrorUrl(new URL(request.url));
  if (!mirror) return fetch(request);
  // The first attempt uses up the body; keep a copy for the retry.
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const retry = hasBody ? request.clone() : null;
  try {
    return await fetch(request);
  } catch (error) {
    // A request the page gave up on must not be sent again.
    if (request.signal.aborted) throw error;
    const body = retry ? await retry.arrayBuffer() : null;
    const answer = await requestThroughMirror(request, body, mirror);
    // The mirror has no session of this user: Safari blocks its cookie, or it
    // was never copied. That says nothing about the session on the host, and
    // the page would sign the user out, so fail as without the mirror.
    if (answer.status === 401) throw error;
    return answer;
  }
}
