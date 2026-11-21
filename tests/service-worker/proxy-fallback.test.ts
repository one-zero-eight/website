import { afterEach, expect, test, vi } from "vitest";

// Read once, when the module loads: the same build-time env the worker gets.
vi.stubEnv(
  "VITE_PROXY_HOSTS",
  " api.test = mirror.test , other.test=mirror2.test,broken, same.test=same.test",
);
const { mirrorUrl, networkFetch, parseProxyHosts } =
  await import("../../src/service-worker/proxy-fallback");

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(handler: (request: Request) => Promise<Response>) {
  const fetch = vi.fn(handler);
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

test("reads host pairs from the environment and ignores broken ones", () => {
  expect([...parseProxyHosts("a.test=b.test, c.test=c.test,broken")]).toEqual([
    ["a.test", "b.test"],
  ]);
});

test("maps a host to its mirror and keeps the rest of the URL", () => {
  expect(
    mirrorUrl(new URL("https://api.test/accounts/v0/users/me?x=1"))?.href,
  ).toBe("https://mirror.test/accounts/v0/users/me?x=1");
  expect(mirrorUrl(new URL("https://unknown.test/users/me"))).toBeNull();
});

test("leaves a reachable request alone", async () => {
  const fetch = stubFetch(async () => new Response("from the host"));
  const request = new Request("https://api.test/users/me");

  const response = await networkFetch(request);

  expect(await response.text()).toBe("from the host");
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0][0]).toBe(request);
});

test("does not touch a host without a mirror", async () => {
  const fetch = stubFetch(async () => {
    throw new TypeError("Failed to fetch");
  });

  await expect(
    networkFetch(new Request("https://unknown.test/users/me")),
  ).rejects.toThrow("Failed to fetch");
  expect(fetch).toHaveBeenCalledTimes(1);
});

test("retries an unreachable request on the mirror with the same method and body", async () => {
  const seen: string[] = [];
  stubFetch(async (request) => {
    const body = await request.text();
    seen.push(
      `${request.method} ${request.url} ${request.credentials} ${body}`,
    );
    if (request.url.startsWith("https://api.test/"))
      throw new TypeError("Failed to fetch");
    return new Response("from the mirror");
  });
  const request = new Request("https://api.test/echo?x=1", {
    method: "POST",
    body: "hello",
    credentials: "include",
  });

  const response = await networkFetch(request);

  expect(await response.text()).toBe("from the mirror");
  expect(seen).toEqual([
    "POST https://api.test/echo?x=1 include hello",
    "POST https://mirror.test/echo?x=1 include hello",
  ]);
});

test("fails as without the mirror when the mirror does not know the user", async () => {
  const unreachable = new TypeError("Failed to fetch");
  stubFetch(async (request) => {
    if (request.url.startsWith("https://api.test/")) throw unreachable;
    return new Response("Not authenticated", { status: 401 });
  });

  await expect(
    networkFetch(new Request("https://api.test/users/me")),
  ).rejects.toBe(unreachable);
});

test("does not retry a request whose signal was aborted", async () => {
  const fetch = stubFetch(async () => {
    throw new TypeError("Failed to fetch");
  });
  const controller = new AbortController();
  controller.abort();

  await expect(
    networkFetch(
      new Request("https://api.test/echo", {
        method: "POST",
        body: "abandoned",
        signal: controller.signal,
      }),
    ),
  ).rejects.toThrow("Failed to fetch");
  expect(fetch).toHaveBeenCalledTimes(1);
});
