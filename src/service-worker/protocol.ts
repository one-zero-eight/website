export type BuildInfo = {
  version: string;
  /** Opaque per-deploy id; used for cache names and HTML data-build-id pinning. */
  buildId: string;
  /** Digest of the app resource list (not of sw.js). */
  resourcesBuildHash: string;
  commitHash: string;
  builtAt: string;
};

/**
 * Only the worker code digest is embedded in sw.js. App buildId/builtAt must
 * not appear here — otherwise every site deploy would change sw.js bytes and
 * force a service-worker update in the browser.
 */
export type WorkerBuildInfo = {
  /** SHA-256 of compiled sw.js code, excluding the metadata bootstrap line. */
  serviceWorkerHash: string;
};

export type BuildResource = { url: string; integrity: string; size: number };

/**
 * External app snapshot, fetched at runtime (not baked into sw.js).
 *
 * resourcesBuildHash = SHA-256(JSON.stringify(resources sorted by URL)), excluding
 * the build's own build-info file, sw.js, this manifest and source maps.
 * Resource integrity is SHA-384 of final bytes; the build-info file is still
 * verified and stored in the complete snapshot, but cannot hash its own digest.
 */
export type BuildManifest = {
  schemaVersion: 1;
  buildInfo: BuildInfo;
  entrypoint: string;
  resources: BuildResource[];
};

/** The page reports its build ID, not a manifest. The SW fetches manifests itself. */
export type ClientHelloCommand = {
  type: "CLIENT_HELLO";
  buildId: string;
  pathname: string;
  interval: number;
  nextCheckAt: string | null;
};

export type ClientHelloReply = {
  generation: number;
  /** Actual source of this document, or null for a page not pinned during navigation. */
  navigationSource: "network" | "cache" | null;
};

/** Which cached build a tab (or in-flight navigation) is allowed to read. */
export type ClientPin = {
  clientId: string;
  buildId: string;
  pathname: string;
  interval: number;
  nextCheckAt: string | null;
  navigationSource?: "network" | "cache";
  /** Set only on a navigation pin, which is kept briefly until CLIENT_HELLO replaces it. */
  reservedAt?: number;
  /** Actual last page report; absent for navigation-only or previously stored pins. */
  lastHello?: {
    message: ClientHelloCommand;
    receivedAt: string;
    receivedBy: { scriptURL: string; serviceWorkerHash: string };
  };
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

export type CacheSummary = { name: string; entries: number; bytes: number };

/** Each source stays separate; storage is shared, worker identity and clients are not. */
export type WorkerDiagnosticsSnapshot = {
  worker: {
    buildInfo: WorkerBuildInfo;
    scriptURL: string;
    scope: string;
  };
  storage: WorkerState;
  runtimeClients: {
    requestingClientId: string | null;
    windows: {
      id: string;
      url: string;
      focused: boolean;
      visibilityState: "hidden" | "visible";
      controlled: boolean;
    }[];
  };
  cacheStorage: CacheSummary[];
};

export type WorkerCommand =
  | ClientHelloCommand
  | { type: "CHECK_MANIFEST" }
  | { type: "GET_STATE" }
  | { type: "GET_DIAGNOSTICS" }
  | { type: "RESET" };

/** Sent by the worker to each window when a complete build becomes ready. */
export type BuildReadyNotification = {
  type: "BUILD_READY";
  buildInfo: BuildInfo;
  generation: number;
};

/**
 * Every reset (by the worker or, without a controller, by a page) is announced
 * on this channel, so controlled, uncontrolled and resetting pages all hear it.
 */
export const resetChannelName = "innohassle-sw-reset";
export type ResetNotification = {
  type: "CACHE_INVALIDATED";
  generation: number;
};

/** API responses of the signed-in user (calendar feeds, schedule, account); deleted on logout. */
export const userDataCacheName = "api-user-data";
export const mapsCacheName = "api-maps";

export function isTvPath(pathname: string) {
  return pathname === "/tv" || pathname.startsWith("/tv/");
}

/** TV rooms auto-reload on new builds, so they poll much more often. */
export function manifestPollInterval(pathname: string) {
  return isTvPath(pathname) ? 60_000 : 30 * 60_000;
}
