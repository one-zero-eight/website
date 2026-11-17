import {
  resetChannelName,
  type ApiRoutes,
  type ResetNotification,
  type WorkerState,
} from "./protocol.ts";

/**
 * Durable worker metadata lives in IndexedDB (survives SW stop/restart).
 * Cache Storage holds the actual bytes; this record points at those caches.
 *
 * Web Locks serialize writers across the controlling worker, a replaced
 * worker still finishing work, and uncontrolled pages that call purge/reset
 * directly when no controller is available.
 */
const STORAGE_LOCK = "innohassle-sw-storage";
const DATABASE_NAME = "innohassle-service-worker";

export function emptyWorkerState(): WorkerState {
  return {
    generation: 0,
    blocked: false,
    resetPending: false,
    latestReadyBuildId: null,
    builds: [],
    clients: [],
    manifestCheck: null,
    lastSuccessfulCheckAt: null,
  };
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("state");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readRecord<T>(key: string): Promise<T | undefined> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction("state", "readonly");
    const request = transaction.objectStore("state").get(key);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
    transaction.onabort = () => database.close();
  });
}

async function writeRecord(key: string, value: unknown) {
  const database = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction("state", "readwrite");
    transaction.objectStore("state").put(value, key);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onabort = transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
  });
}

export async function readWorkerState(): Promise<WorkerState> {
  return (await readRecord<WorkerState>("current")) ?? emptyWorkerState();
}

function writeWorkerState(state: WorkerState) {
  return writeRecord("current", state);
}

/**
 * Where API requests go (see worker/api-route.ts). Knowledge of the network,
 * not offline data: kept apart from the state, so a reset does not drop it.
 */
export async function readApiRoutes(): Promise<ApiRoutes> {
  return (await readRecord<ApiRoutes>("apiRoutes")) ?? {};
}

export function writeApiRoutes(routes: ApiRoutes) {
  return writeRecord("apiRoutes", routes);
}

/** Read under the lock (e.g. so a cache cannot be deleted meanwhile), without writing back. */
export async function inspectWorkerState<T>(
  callback: (state: WorkerState) => Promise<T>,
): Promise<T> {
  return navigator.locks.request(STORAGE_LOCK, async () =>
    callback(await readWorkerState()),
  );
}

/** Read, modify and persist under the lock. Nothing is written if the callback throws. */
export async function withWorkerState<T>(
  callback: (state: WorkerState) => Promise<T>,
): Promise<T> {
  return navigator.locks.request(STORAGE_LOCK, async () => {
    const state = await readWorkerState();
    const result = await callback(state);
    await writeWorkerState(state);
    return result;
  });
}

async function deleteAllCaches() {
  for (const name of await caches.keys()) await caches.delete(name);
}

/**
 * Wipe every Cache Storage entry, bump generation and announce the reset.
 *
 * Keeps `blocked` so a dying worker cannot repopulate caches until a fresh
 * page registration clears the gate.
 */
export async function purgeWorkerCaches() {
  const state = await navigator.locks.request(STORAGE_LOCK, async () => {
    const previous = await readWorkerState();
    const state = emptyWorkerState();
    state.generation = previous.generation + 1;
    state.blocked = true;
    // Persist before deleting caches: if we crash mid-delete, recoverPendingPurge
    // finishes the wipe on the next start.
    state.resetPending = true;
    await writeWorkerState(state);
    await deleteAllCaches();
    state.resetPending = false;
    await writeWorkerState(state);
    return state;
  });
  const channel = new BroadcastChannel(resetChannelName);
  channel.postMessage({
    type: "CACHE_INVALIDATED",
    generation: state.generation,
  } satisfies ResetNotification);
  channel.close();
  return state;
}

/**
 * Delete caches that neither a stored build nor `keep` refers to: those of a
 * previous worker implementation, or an orphan of an interrupted operation.
 */
export async function deleteUnknownCaches(keep: string[]) {
  await navigator.locks.request(STORAGE_LOCK, async () => {
    const state = await readWorkerState();
    const known = new Set([
      ...keep,
      ...state.builds.map((build) => build.cacheName),
    ]);
    for (const name of await caches.keys())
      if (!known.has(name)) await caches.delete(name);
  });
}

export async function recoverPendingPurge() {
  return navigator.locks.request(STORAGE_LOCK, async () => {
    const state = await readWorkerState();
    if (!state.resetPending) return;
    await deleteAllCaches();
    state.resetPending = false;
    state.blocked = true;
    await writeWorkerState(state);
  });
}
