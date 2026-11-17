import { expect, test, vi } from "vitest";

// Read once, when the module loads: the same build-time env the worker gets.
vi.stubEnv(
  "VITE_PROXY_HOSTS",
  " api.test = mirror.test , other.test=mirror2.test,broken, same.test=same.test",
);
const { mirrorUrl, parseProxyHosts } =
  await import("../../src/service-worker/proxy-fallback");

test("reads host pairs from the environment and ignores broken ones", () => {
  expect([...parseProxyHosts("a.test=b.test, c.test=c.test,broken")]).toEqual([
    ["a.test", "b.test"],
  ]);
});

test("maps a host to its mirror and keeps the rest of the URL", () => {
  expect(
    mirrorUrl(new URL("https://api.test/accounts/v0/users/me?x=1"))?.href,
  ).toBe("https://mirror.test/accounts/v0/users/me?x=1");
  expect(mirrorUrl(new URL("https://other.test/a"))?.host).toBe("mirror2.test");
  expect(mirrorUrl(new URL("https://unknown.test/users/me"))).toBeNull();
  expect(mirrorUrl(new URL("https://same.test/users/me"))).toBeNull();
});
