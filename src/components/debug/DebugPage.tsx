import { resetServiceWorker } from "@/app/sw-client.ts";
import { cn } from "@/lib/ui/cn";
import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { useAutoUpdateBlocker } from "@/app/use-auto-update-blocker.ts";
import { useEffect, useState } from "react";
import { AppDiagnostics } from "./AppDiagnostics.tsx";
import { BrowserDiagnostics } from "./BrowserDiagnostics.tsx";
import { WorkerDiagnostics } from "./WorkerDiagnostics.tsx";
import { collectDebugSnapshot } from "./collect-debug-snapshot.ts";

const refreshInterval = 5_000;

export function DebugPage() {
  const [pauseAutomaticUpdates, setPauseAutomaticUpdates] = useState(false);
  useAutoUpdateBlocker(pauseAutomaticUpdates);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const {
    data: snapshot,
    isPending,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["service-worker-diagnostics"],
    queryFn: collectDebugSnapshot,
    enabled: !isResetting,
    refetchInterval: refreshInterval,
    retry: false,
  });

  useEffect(() => {
    if (isResetting) return;
    function handleRefresh() {
      void refetch();
    }
    function handleConnectionChange() {
      setIsOnline(navigator.onLine);
      if (navigator.onLine) void refetch();
    }
    window.addEventListener("online", handleConnectionChange);
    window.addEventListener("offline", handleConnectionChange);
    window.addEventListener("sw-check-completed", handleRefresh);
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        handleRefresh,
      );
    return () => {
      window.removeEventListener("online", handleConnectionChange);
      window.removeEventListener("offline", handleConnectionChange);
      window.removeEventListener("sw-check-completed", handleRefresh);
      if ("serviceWorker" in navigator)
        navigator.serviceWorker.removeEventListener(
          "controllerchange",
          handleRefresh,
        );
    };
  }, [isResetting, refetch]);

  async function handleReset() {
    if (isResetting) return;
    setIsResetting(true);
    setResetError(null);
    try {
      await resetServiceWorker();
    } catch (error) {
      setResetError(error instanceof Error ? error.message : String(error));
      setIsResetting(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-6 p-4">
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="text-xl font-semibold">
            <Trans>App and offline diagnostics</Trans>
          </h1>
          <p className="text-base-content/70 max-w-3xl text-sm">
            <Trans>
              App observations, browser roles, and worker replies are separate
              sources. Each worker is queried directly; the same instance can
              have several roles.
            </Trans>
          </p>
          <p className="text-base-content/60 text-xs">
            <Trans>
              Refreshes every 5 seconds while visible. Reading a snapshot does
              not check for a deployment or download a build. Sources are
              sampled at different times.
            </Trans>
          </p>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={pauseAutomaticUpdates}
              onChange={(event) =>
                setPauseAutomaticUpdates(event.target.checked)
              }
            />
            <Trans>Pause automatic updates on this page</Trans>
          </label>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span
              className={cn(
                "badge badge-soft badge-sm",
                isOnline ? "badge-success" : "badge-warning",
              )}
              title="navigator.onLine"
            >
              {isOnline ? <Trans>Online</Trans> : <Trans>Offline</Trans>}
            </span>
            {snapshot && (
              <time dateTime={snapshot.completedAt}>
                {snapshot.completedAt}
              </time>
            )}
          </div>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={isFetching || isResetting}
          onClick={() => void refetch()}
        >
          {isFetching && (
            <span className="loading loading-spinner loading-sm" />
          )}
          <Trans>Refresh snapshot</Trans>
        </button>
      </section>

      {isError && (
        <div className="alert alert-error wrap-anywhere">{error.message}</div>
      )}
      {isPending && (
        <div className="grid gap-4 @3xl/content:grid-cols-2">
          <div className="skeleton h-64" />
          <div className="skeleton h-64" />
        </div>
      )}

      {snapshot && (
        <>
          <AppDiagnostics app={snapshot.app} />
          <BrowserDiagnostics browser={snapshot.browser} />
          {snapshot.workers.map((worker) => (
            <WorkerDiagnostics
              key={worker.browser.id}
              snapshot={worker}
              appBuildInfo={snapshot.app.buildInfo}
            />
          ))}
        </>
      )}

      <section className="border-error/40 rounded-box flex flex-col gap-3 border p-4">
        <h2 className="text-lg font-semibold">
          <Trans>Reset offline storage</Trans>
        </h2>
        <p className="text-base-content/70 text-sm">
          <Trans>
            This clears ALL Cache Storage caches for this origin, unregisters
            all service workers, and reloads the page. All cached builds will be
            removed.
          </Trans>
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
          {isResetting ? (
            <Trans>Resetting…</Trans>
          ) : (
            <Trans>Clear ALL caches, unregister, and reload</Trans>
          )}
        </button>
      </section>
    </div>
  );
}
