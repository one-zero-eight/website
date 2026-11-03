export type BuildInfo = {
  version: string;
  /** Opaque per-deploy id; used for cache names and HTML data-build-id pinning. */
  buildId: string;
  /** Digest of the app resource list (not of sw.js). */
  buildHash: string;
  commitHash: string;
  builtAt: string;
};

/**
 * Only the worker code digest is embedded in sw.js. App buildId/builtAt must
 * not appear here — otherwise every site deploy would change sw.js bytes and
 * force a service-worker update in the browser.
 */
export type WorkerBuildInfo = { buildHash: string };

export type BuildResource = { url: string; integrity: string; size: number };

/**
 * External app snapshot, fetched at runtime (not baked into sw.js).
 *
 * buildHash = SHA-256(JSON.stringify(resources sorted by URL)), excluding
 * runtime build-info.js, sw.js, this manifest and source maps. Resource
 * integrity is SHA-384 of final bytes; build-info.js is still verified and
 * stored in the complete snapshot, but cannot hash its own digest.
 */
export type BuildManifest = {
  schemaVersion: 1;
  buildInfo: BuildInfo;
  entrypoint: string;
  resources: BuildResource[];
};

/** Which cached build a tab (or in-flight navigation) is allowed to read. */
export type ClientPin = {
  clientId: string;
  buildId: string;
  pathname: string;
  interval: number;
  nextCheckAt: string | null;
  /** Temporary pin created during navigate before CLIENT_HELLO arrives. */
  reservedAt?: number;
};

export type CachedBuild = {
  manifest: BuildManifest;
  cacheName: string;
  /**
   * ready = every resource passed integrity and may be used offline.
   * downloading = incomplete or failed; never chosen as offline fallback.
   */
  state: "downloading" | "ready" | "deleting";
  completed: number;
  error: string | null;
};

export type ManifestCheck = {
  startedAt: string;
  completedAt: string | null;
  succeeded: boolean;
  buildId: string | null;
  error: string | null;
};

export type WorkerState = {
  /**
   * Bumped on RESET so in-flight work from the previous era rejects itself
   * instead of writing into freshly wiped caches.
   */
  generation: number;
  /**
   * When true, navigation/asset handlers refuse cached snapshots (used while
   * reset is in progress or until a new page unlocks after debug reset).
   */
  blocked: boolean;
  /** Durable flag: purge did not finish; next SW start must complete it. */
  resetPending: boolean;
  latestReadyBuildId: string | null;
  builds: CachedBuild[];
  clients: ClientPin[];
  manifestCheck: ManifestCheck | null;
  lastSuccessfulCheckAt: string | null;
};

export type WorkerStatus = WorkerState & {
  buildInfo: WorkerBuildInfo;
  scope: string;
  caches: { name: string; entries: number; bytes: number }[];
};

export type WorkerCommand =
  | {
      type: "CLIENT_HELLO";
      buildId: string;
      pathname: string;
      interval: number;
      nextCheckAt: string | null;
    }
  | { type: "CHECK_MANIFEST" }
  | { type: "GET_STATUS" }
  | { type: "GET_STATE" }
  | { type: "GET_BUILD_INFO" }
  | { type: "RESET" };

export type WorkerNotification =
  | { type: "BUILD_READY"; buildInfo: BuildInfo; generation: number }
  | { type: "CACHE_INVALIDATED"; generation: number; reset: boolean };

export function isTvPath(pathname: string) {
  return pathname === "/tv" || pathname.startsWith("/tv/");
}

/** TV rooms auto-reload on new builds, so they poll much more often. */
export function manifestPollInterval(pathname: string) {
  return isTvPath(pathname) ? 60_000 : 30 * 60_000;
}
