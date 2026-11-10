import { getPageWorkerCommunication } from "@/app/register-sw.ts";
import { requestWorker } from "@/app/sw-client.ts";
import type { WorkerDiagnosticsSnapshot } from "@/service-worker/protocol.ts";

export type WorkerRole = "controlling" | "active" | "waiting" | "installing";

export type BrowserWorker = {
  /** Local reference within this snapshot, not a browser-provided worker ID. */
  id: string;
  roles: WorkerRole[];
  scriptURL: string;
  state: ServiceWorkerState;
};

export type BrowserSnapshot = {
  observedAt: string;
  supported: boolean;
  online: boolean;
  controller: string | null;
  registrations: {
    scope: string;
    updateViaCache: ServiceWorkerUpdateViaCache;
    active: string | null;
    waiting: string | null;
    installing: string | null;
  }[];
  error: string | null;
};

export type WorkerSnapshot = {
  browser: BrowserWorker;
  receivedAt: string;
  /** Only this worker's GET_DIAGNOSTICS response. Never substituted with another reply. */
  reply: WorkerDiagnosticsSnapshot | null;
  error: string | null;
};

export type DebugSnapshot = Awaited<ReturnType<typeof collectDebugSnapshot>>;

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

/** App-owned values: no browser registration or worker response is read here. */
export function readAppSnapshot() {
  return {
    observedAt: new Date().toISOString(),
    url: window.location.href,
    htmlBuildId: document.documentElement.dataset.buildId ?? null,
    buildInfo: BUILD_INFO,
    communication: getPageWorkerCommunication(),
  };
}

/** Reading diagnostics does not send CLIENT_HELLO or trigger a manifest check. */
export async function collectDebugSnapshot() {
  const app = readAppSnapshot();
  const browser: BrowserSnapshot = {
    observedAt: new Date().toISOString(),
    supported: "serviceWorker" in navigator,
    online: navigator.onLine,
    controller: null,
    registrations: [],
    error: null,
  };
  const workerReferences = new Map<ServiceWorker, BrowserWorker>();

  function registerBrowserWorker(
    worker: ServiceWorker | null,
    role: WorkerRole,
  ) {
    if (!worker) return null;
    let reference = workerReferences.get(worker);
    if (!reference) {
      reference = {
        id: `worker-${workerReferences.size + 1}`,
        roles: [],
        scriptURL: worker.scriptURL,
        state: worker.state,
      };
      workerReferences.set(worker, reference);
    }
    if (!reference.roles.includes(role)) reference.roles.push(role);
    return reference.id;
  }

  if (browser.supported) {
    // Keep the current controller even if reading the registrations fails.
    browser.controller = registerBrowserWorker(
      navigator.serviceWorker.controller,
      "controlling",
    );
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      browser.registrations = registrations.map((registration) => ({
        scope: registration.scope,
        updateViaCache: registration.updateViaCache,
        active: registerBrowserWorker(registration.active, "active"),
        waiting: registerBrowserWorker(registration.waiting, "waiting"),
        installing: registerBrowserWorker(
          registration.installing,
          "installing",
        ),
      }));
    } catch (error) {
      browser.error = formatError(error);
    }
  }

  const workers: WorkerSnapshot[] = await Promise.all(
    [...workerReferences].map(async ([worker, reference]) => {
      try {
        const reply = await requestWorker<WorkerDiagnosticsSnapshot>(
          { type: "GET_DIAGNOSTICS" },
          worker,
        );
        return {
          browser: reference,
          receivedAt: new Date().toISOString(),
          reply,
          error: null,
        };
      } catch (error) {
        return {
          browser: reference,
          receivedAt: new Date().toISOString(),
          reply: null,
          error: formatError(error),
        };
      }
    }),
  );

  return { app, browser, workers, completedAt: new Date().toISOString() };
}
