import {
  appUpdateAvailableEvent,
  getIsAppUpdatePending,
} from "@/service-worker/page/register-sw.ts";
import { Trans } from "@lingui/react/macro";
import { cn } from "@/lib/ui/cn";
import { useEffect, useState } from "react";

export function AppUpdatePrompt() {
  const [isUpdatePending, setIsUpdatePending] = useState(getIsAppUpdatePending);
  const [isReloading, setIsReloading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    function handleAppUpdateAvailable() {
      setIsUpdatePending(getIsAppUpdatePending());
      setIsDismissed(false);
      setIsReloading(false);
    }

    window.addEventListener(appUpdateAvailableEvent, handleAppUpdateAvailable);

    return () => {
      window.removeEventListener(
        appUpdateAvailableEvent,
        handleAppUpdateAvailable,
      );
    };
  }, []);

  if (!isUpdatePending || isDismissed) return null;

  return (
    <div className="pointer-events-none fixed top-[calc(3rem+env(safe-area-inset-bottom)+0.75rem)] right-4 left-4 z-50 flex justify-center sm:top-4 sm:bottom-auto sm:left-auto sm:justify-end">
      <div
        className={cn(
          "alert border-primary pointer-events-auto flex w-full max-w-md items-center gap-3 shadow-lg",
        )}
      >
        <span className="icon-[material-symbols--info-outline] text-primary content-justify-center shrink-0 text-2xl" />
        <div className="min-w-0 flex-1">
          <h4 className="font-bold">
            <Trans>The website is updated.</Trans>
          </h4>
          <p className="text-xs">
            <Trans>Please, reload the page.</Trans>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={isReloading}
            onClick={() => {
              setIsReloading(true);
              window.location.reload();
            }}
          >
            {isReloading && (
              <span className="loading loading-spinner loading-sm" />
            )}
            <Trans>Reload</Trans>
          </button>
          <button
            type="button"
            className="btn btn-square btn-ghost btn-sm"
            onClick={() => setIsDismissed(true)}
          >
            <span className="icon-[material-symbols--close] text-lg" />
          </button>
        </div>
      </div>
    </div>
  );
}
