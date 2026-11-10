/**
 * @param {import("../../src/service-worker/protocol.ts").BuildManifest} previous
 * @param {import("../../src/service-worker/protocol.ts").BuildManifest} next
 */
export function classifyResourceChanges(previous, next) {
  const previousByUrl = new Map(
    previous.resources.map((resource) => [resource.url, resource]),
  );
  const isUnchanged = (resource) => {
    const cached = previousByUrl.get(resource.url);
    return (
      cached?.integrity === resource.integrity && cached.size === resource.size
    );
  };
  return {
    unchanged: next.resources.filter(isUnchanged),
    updated: next.resources.filter((resource) => !isUnchanged(resource)),
  };
}

/**
 * Count actual server requests for snapshot files, including repeated requests.
 * Manifest checks, route navigations and API calls are not snapshot files.
 * @template {{ url: string }} T
 * @param {T[]} requests
 * @param {import("../../src/service-worker/protocol.ts").BuildManifest} manifest
 */
export function getResourceDownloads(requests, manifest) {
  const resourceUrls = new Set(
    manifest.resources.map((resource) => resource.url),
  );
  return requests.filter((request) => resourceUrls.has(request.url));
}
