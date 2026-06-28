import { useAccountsApiAvailability } from "@/api/accounts/api-availability.ts";
import { cn } from "@/lib/ui/cn";
import { useEffect, useMemo, useState } from "react";

export function ConnectivityNotification() {
  const { isUnavailable: isAccountsApiUnavailable } =
    useAccountsApiAvailability();
  const [isOffline, setIsOffline] = useState(
    () => typeof navigator !== "undefined" && !navigator.onLine,
  );
  const [isClosed, setIsClosed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      setIsClosed(false);
      setIsExpanded(false);
    };

    const handleOnline = () => {
      setIsOffline(false);
      setIsClosed(false);
      setIsExpanded(false);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  useEffect(() => {
    if (!isAccountsApiUnavailable) {
      setIsClosed(false);
      setIsExpanded(false);
    }
  }, [isAccountsApiUnavailable]);

  const issue = useMemo(() => {
    if (isOffline) {
      return {
        title: "You are offline",
        description: "Connect to the internet to keep using InNoHassle.",
        suggestions: [
          "Connect to WiFi or mobile internet.",
          "Check that airplane mode is disabled.",
          "Reload the page after the connection is restored.",
        ],
      };
    }

    if (isAccountsApiUnavailable) {
      return {
        title: "Couldn't connect to InNoHassle servers",
        description:
          "Try to disable VPN and connect to University WiFi, then reload the page.",
      };
    }

    return null;
  }, [isAccountsApiUnavailable, isOffline]);

  if (!issue || isClosed) {
    return null;
  }

  return (
    <div className="fixed top-2 right-2 z-50 w-[calc(100%-1rem)] max-w-md sm:top-auto sm:bottom-2">
      <div className="rounded-box bg-warning text-error-content shadow-lg">
        <div className="flex items-start gap-2">
          <button
            type="button"
            className="flex min-w-0 flex-1 flex-col items-start gap-0.5 px-3 py-2 text-left"
            onClick={() => setIsExpanded((value) => !value)}
          >
            <span className="text-s font-semibold">{issue.title}</span>
            <span className="text-s opacity-85">{issue.description}</span>
          </button>
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            onClick={() => setIsClosed(true)}
          >
            <span className="icon-[material-symbols--close] text-2xl" />
          </button>
        </div>

        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-200",
            isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        ></div>
      </div>
    </div>
  );
}
