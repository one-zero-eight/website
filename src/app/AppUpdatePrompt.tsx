import { appUpdateAvailableEvent } from "@/app/register-sw.ts";
import { cn } from "@/lib/ui/cn";
import { useEffect, useState } from "react";

type AppUpdateEvent = CustomEvent<{
  reload: () => Promise<void>;
}>;

export function AppUpdatePrompt() {
  const [reloadWebsite, setReloadWebsite] = useState<() => Promise<void>>();
  const [isReloading, setIsReloading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    function handleAppUpdateAvailable(event: Event) {
      setReloadWebsite(() => (event as AppUpdateEvent).detail.reload);
      setIsDismissed(false);
    }

    window.addEventListener(appUpdateAvailableEvent, handleAppUpdateAvailable);

    return () => {
      window.removeEventListener(
        appUpdateAvailableEvent,
        handleAppUpdateAvailable,
      );
    };
  }, []);

  if (!reloadWebsite || isDismissed) return null;

  return (
    <div className="pointer-events-none fixed top-[calc(3rem+env(safe-area-inset-bottom)+0.75rem)] right-4 left-4 z-50 flex justify-center sm:top-4 sm:bottom-auto sm:left-auto sm:justify-end">
      <div
        className={cn(
          "alert border-primary pointer-events-auto flex w-full max-w-md items-center gap-3 shadow-lg",
        )}
      >
        <span className="icon-[material-symbols--info-outline] text-primary content-justify-center shrink-0 text-2xl" />
        <div className="min-w-0 flex-1">
          <h4 className="font-bold">The website is updated.</h4>
          <p className="text-xs">Please, reload the page.</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={isReloading}
            onClick={() => {
              setIsReloading(true);
              void reloadWebsite();
            }}
          >
            {isReloading && (
              <span className="loading loading-spinner loading-sm" />
            )}
            Reload
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
