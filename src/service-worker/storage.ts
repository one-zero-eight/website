import type { WorkerState } from "./protocol.ts";

/**
 * Durable worker metadata lives in IndexedDB (survives SW stop/restart).
 * Cache Storage holds the actual bytes; this record points at those caches.
 *
 * Web Locks serialize writers across the controlling worker, a replaced
 * worker still finishing work, and uncontrolled pages that call purge/reset
 * directly when no controller is available.
 */
export const STORAGE_LOCK = "innohassle-sw-storage";
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

/** Drop fields from older schemas (e.g. removed API-cache identity). */
function normalizeWorkerState(
  raw: Partial<WorkerState> | undefined,
): WorkerState {
  const empty = emptyWorkerState();
  if (!raw) return empty;
  return {
    generation: raw.generation ?? empty.generation,
    blocked: raw.blocked ?? empty.blocked,
    resetPending: raw.resetPending ?? empty.resetPending,
    latestReadyBuildId: raw.latestReadyBuildId ?? empty.latestReadyBuildId,
    builds: raw.builds ?? empty.builds,
    clients: (raw.clients ?? empty.clients).map((pin) => ({
      clientId: pin.clientId,
      buildId: pin.buildId,
      pathname: pin.pathname,
      interval: pin.interval,
      nextCheckAt: pin.nextCheckAt,
      reservedAt: pin.reservedAt,
    })),
    manifestCheck: raw.manifestCheck ?? empty.manifestCheck,
    lastSuccessfulCheckAt:
      raw.lastSuccessfulCheckAt ?? empty.lastSuccessfulCheckAt,
  };
}

export async function readWorkerState(): Promise<WorkerState> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction("state", "readonly");
    const request = transaction.objectStore("state").get("current");
    request.onsuccess = () =>
      resolve(normalizeWorkerState(request.result as Partial<WorkerState>));
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
    transaction.onabort = () => database.close();
  });
}

export async function writeWorkerState(state: WorkerState) {
  const database = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction("state", "readwrite");
    transaction.objectStore("state").put(state, "current");
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

/**
 * Wipe every Cache Storage entry and bump generation.
 *
 * reset=true keeps `blocked` so a dying worker cannot repopulate caches until
 * a fresh page registration clears the gate. reset=false is unused today but
 * leaves the worker usable after a non-debug purge.
 */
export async function purgeWorkerCaches(reset = false) {
  return navigator.locks.request(STORAGE_LOCK, async () => {
    const previous = await readWorkerState();
    const state = emptyWorkerState();
    state.generation = previous.generation + 1;
    state.blocked = true;
    // Persist before deleting caches: if we crash mid-delete, recoverPendingPurge
    // finishes the wipe on the next start.
    state.resetPending = true;
    await writeWorkerState(state);
    for (const name of await caches.keys()) await caches.delete(name);
    state.resetPending = false;
    state.blocked = reset;
    await writeWorkerState(state);
    return state;
  });
}

export async function recoverPendingPurge() {
  return navigator.locks.request(STORAGE_LOCK, async () => {
    const state = await readWorkerState();
    if (!state.resetPending) return;
    for (const name of await caches.keys()) await caches.delete(name);
    state.resetPending = false;
    state.blocked = true;
    await writeWorkerState(state);
  });
}
