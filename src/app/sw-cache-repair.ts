const ASSET_PATH_PATTERN = /\/assets\/.*\.(?:js|css|woff2)$/i;

function isAssetRequest(url: string) {
  return ASSET_PATH_PATTERN.test(new URL(url).pathname);
}

async function isPoisonedAssetResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("text/html")) return true;

  if (
    contentType.includes("javascript") ||
    contentType.includes("css") ||
    contentType.includes("font")
  ) {
    return false;
  }

  if (!isAssetRequest(response.url)) return false;

  const text = await response.clone().text();
  const trimmed = text.trimStart().slice(0, 32).toLowerCase();
  return trimmed.startsWith("<!doctype") || trimmed.startsWith("<html");
}

export async function repairPoisonedPrecache(
  registration: ServiceWorkerRegistration,
) {
  if (!("caches" in window)) return false;

  let purged = false;

  for (const cacheName of await caches.keys()) {
    if (!cacheName.startsWith("workbox-precache")) continue;

    const cache = await caches.open(cacheName);
    for (const request of await cache.keys()) {
      if (!isAssetRequest(request.url)) continue;

      const response = await cache.match(request);
      if (!response) continue;
      if (!(await isPoisonedAssetResponse(response))) continue;

      await cache.delete(request);
      purged = true;
    }
  }

  if (!purged) return false;

  await registration.update();
  window.location.reload();
  return true;
}
