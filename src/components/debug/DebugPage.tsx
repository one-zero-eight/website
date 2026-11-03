import { requestWorker, resetServiceWorker } from "@/app/sw-client.ts";
import { cn } from "@/lib/ui/cn";
import type {
  WorkerBuildInfo,
  WorkerStatus,
} from "@/service-worker/protocol.ts";
import { useCallback, useEffect, useRef, useState } from "react";

const refreshInterval = 5_000;

type WorkerDetails = {
  role: "Controlling" | "Active" | "Waiting" | "Installing";
  scriptURL: string;
  state: ServiceWorkerState;
  buildInfo: WorkerBuildInfo | null;
  error: string | null;
};

type DebugSnapshot = {
  scope: string | null;
  workers: WorkerDetails[];
  status: WorkerStatus | null;
  error: string | null;
  refreshedAt: string;
};

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function JsonSnapshot({ title, value }: { title: string; value: unknown }) {
  return (
    <section className="bg-base-200 rounded-box min-w-0 p-4">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      <pre className="bg-base-100 rounded-box max-h-96 overflow-auto p-3 text-xs wrap-anywhere whitespace-pre-wrap">
        {JSON.stringify(value, null, 2) ?? "No data"}
      </pre>
    </section>
  );
}

export function DebugPage() {
  const [snapshot, setSnapshot] = useState<DebugSnapshot | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const mounted = useRef(false);
  const refreshing = useRef(false);
  const resetting = useRef(false);
  const serviceWorkerSupported = "serviceWorker" in navigator;

  const refresh = useCallback(async () => {
    if (refreshing.current || resetting.current) return;
    refreshing.current = true;
    if (mounted.current) setIsRefreshing(true);

    let nextSnapshot: DebugSnapshot = {
      scope: null,
      workers: [],
      status: null,
      error: null,
      refreshedAt: new Date().toISOString(),
    };

    try {
      if (!("serviceWorker" in navigator)) {
        throw new Error("Service workers are not supported in this browser.");
      }

      // Do not use serviceWorker.ready: it never resolves without a registration.
      const registration = await navigator.serviceWorker.getRegistration();
      const candidates: {
        role: WorkerDetails["role"];
        worker: ServiceWorker | null;
      }[] = [
        { role: "Controlling", worker: navigator.serviceWorker.controller },
        { role: "Active", worker: registration?.active ?? null },
        { role: "Waiting", worker: registration?.waiting ?? null },
        { role: "Installing", worker: registration?.installing ?? null },
      ];
      const workers = candidates.filter(
        (
          candidate,
        ): candidate is {
          role: WorkerDetails["role"];
          worker: ServiceWorker;
        } => candidate.worker !== null,
      );
      const statusWorker = workers[0]?.worker;
      nextSnapshot.scope = registration?.scope ?? null;

      if (!statusWorker) {
        throw new Error(
          "No service worker is registered or controlling this page.",
        );
      }

      // Reuse one build-info request when active and controlling are the same worker.
      const buildRequests = new Map<ServiceWorker, Promise<WorkerBuildInfo>>();
      for (const { worker } of workers) {
        if (!buildRequests.has(worker)) {
          buildRequests.set(
            worker,
            requestWorker<WorkerBuildInfo>({ type: "GET_BUILD_INFO" }, worker),
          );
        }
      }

      const [workerDetails, statusResult] = await Promise.all([
        Promise.all(
          workers.map(async ({ role, worker }): Promise<WorkerDetails> => {
            const details: WorkerDetails = {
              role,
              scriptURL: worker.scriptURL,
              state: worker.state,
              buildInfo: null,
              error: null,
            };
            try {
              details.buildInfo = await buildRequests.get(worker)!;
            } catch (error) {
              details.error = formatError(error);
            }
            return details;
          }),
        ),
        requestWorker<WorkerStatus>({ type: "GET_STATUS" }, statusWorker).then(
          (status) => ({ status, error: null }),
          (error: unknown) => ({ status: null, error: formatError(error) }),
        ),
      ]);
      nextSnapshot = {
        ...nextSnapshot,
        workers: workerDetails,
        ...statusResult,
        refreshedAt: new Date().toISOString(),
      };
    } catch (error) {
      nextSnapshot.error = formatError(error);
    } finally {
      refreshing.current = false;
      if (mounted.current) {
        setSnapshot(nextSnapshot);
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    const timer = window.setInterval(() => void refresh(), refreshInterval);

    function handleConnectionChange() {
      setIsOnline(navigator.onLine);
      void refresh();
    }

    function handleControllerChange() {
      void refresh();
    }

    window.addEventListener("online", handleConnectionChange);
    window.addEventListener("offline", handleConnectionChange);
    if (serviceWorkerSupported) {
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        handleControllerChange,
      );
    }

    return () => {
      mounted.current = false;
      window.clearInterval(timer);
      window.removeEventListener("online", handleConnectionChange);
      window.removeEventListener("offline", handleConnectionChange);
      if (serviceWorkerSupported) {
        navigator.serviceWorker.removeEventListener(
          "controllerchange",
          handleControllerChange,
        );
      }
    };
  }, [refresh, serviceWorkerSupported]);

  async function handleReset() {
    if (resetting.current) return;
    resetting.current = true;
    setIsResetting(true);
    setResetError(null);

    try {
      await resetServiceWorker();
    } catch (error) {
      if (mounted.current) setResetError(formatError(error));
    } finally {
      resetting.current = false;
      if (mounted.current) setIsResetting(false);
    }
  }

  const status = snapshot?.status;

  return (
    <div className="flex min-w-0 flex-col gap-4 p-4">
      <section className="bg-base-200 rounded-box flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="text-xl font-semibold">App and offline diagnostics</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span
              className={cn(
                "badge badge-soft",
                isOnline ? "badge-success" : "badge-warning",
              )}
            >
              {isOnline ? "Online" : "Offline"}
            </span>
            <span>
              Service workers:{" "}
              {serviceWorkerSupported ? "supported" : "unsupported"}
            </span>
          </div>
          <p className="text-base-content/70 text-sm">
            Refreshes every 5 seconds while this page is open.
            {snapshot && ` Last snapshot: ${snapshot.refreshedAt}`}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={isRefreshing || isResetting}
          onClick={() => void refresh()}
        >
          {isRefreshing && (
            <span className="loading loading-spinner loading-sm" />
          )}
          {isRefreshing ? "Refreshing…" : "Refresh snapshot"}
        </button>
      </section>

      {snapshot?.error && (
        <div className="alert alert-error wrap-anywhere">{snapshot.error}</div>
      )}

      <div className="grid min-w-0 gap-4 @3xl/content:grid-cols-2">
        <JsonSnapshot title="Current app build" value={BUILD_INFO} />
        <section className="bg-base-200 rounded-box min-w-0 p-4">
          <h2 className="mb-3 text-lg font-semibold">Registration</h2>
          {!snapshot ? (
            <div className="skeleton h-20 w-full" />
          ) : (
            <dl className="grid gap-3 text-sm">
              <div>
                <dt className="text-base-content/70">Scope</dt>
                <dd className="font-mono wrap-anywhere">
                  {snapshot.scope ?? "No registration"}
                </dd>
              </div>
              <div>
                <dt className="text-base-content/70">Worker lifecycle</dt>
                <dd className="wrap-anywhere">
                  {snapshot.workers.length > 0
                    ? snapshot.workers
                        .map(({ role, state }) => `${role}: ${state}`)
                        .join(" · ")
                    : "No workers"}
                </dd>
              </div>
            </dl>
          )}
        </section>
      </div>

      {!snapshot ? (
        <div className="grid gap-4 @3xl/content:grid-cols-2">
          <div className="skeleton h-48 w-full" />
          <div className="skeleton h-48 w-full" />
        </div>
      ) : (
        <>
          <div className="grid min-w-0 gap-4 @3xl/content:grid-cols-2">
            {(["Controlling", "Active", "Waiting", "Installing"] as const).map(
              (role) => (
                <JsonSnapshot
                  key={role}
                  title={`${role} worker`}
                  value={
                    snapshot.workers.find((worker) => worker.role === role) ??
                    "None"
                  }
                />
              ),
            )}
          </div>
          {status && (
            <div className="grid min-w-0 gap-4 @3xl/content:grid-cols-2">
              <JsonSnapshot
                title="Generation and cache ownership"
                value={{
                  generation: status.generation,
                  blocked: status.blocked,
                  resetPending: status.resetPending,
                  latestReadyBuildId: status.latestReadyBuildId,
                }}
              />
              <JsonSnapshot title="Caches" value={status.caches} />
              <JsonSnapshot
                title="Build download progress"
                value={status.builds}
              />
              <JsonSnapshot
                title="Client pins and next checks"
                value={status.clients}
              />
              <JsonSnapshot
                title="Manifest checks"
                value={{
                  lastAttempt: status.manifestCheck,
                  lastSuccessfulCheckAt: status.lastSuccessfulCheckAt,
                }}
              />
            </div>
          )}
          <JsonSnapshot
            title="Full worker status snapshot"
            value={status ?? "No status available"}
          />
        </>
      )}

      <section className="border-error/40 bg-base-200 rounded-box flex flex-col gap-3 border p-4">
        <h2 className="text-lg font-semibold">Reset offline storage</h2>
        <p className="text-base-content/70 text-sm">
          This clears ALL Cache Storage caches for this origin, unregisters all
          service workers, and reloads the page. All cached builds will be
          removed.
        </p>
        {resetError && (
          <div className="alert alert-error wrap-anywhere">{resetError}</div>
        )}
        <button
          type="button"
          className="btn btn-error self-start"
          disabled={isResetting}
          onClick={() => void handleReset()}
        >
          {isResetting && (
            <span className="loading loading-spinner loading-sm" />
          )}
          {isResetting
            ? "Resetting…"
            : "Clear ALL caches, unregister, and reload"}
        </button>
      </section>
    </div>
  );
}
