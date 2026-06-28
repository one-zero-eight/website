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
        title: "InNoHassle APIs are unavailable",
        description: "The app cannot reach InNoHassle servers right now.",
        suggestions: [
          "Disable VPN or proxy and reload the page.",
          "Connect to Innopolis University WiFi or another stable network.",
          "Check whether api.innohassle.ru opens in your browser.",
          "Try again later if the network is working.",
        ],
      };
    }

    return null;
  }, [isAccountsApiUnavailable, isOffline]);

  if (!issue || isClosed) {
    return null;
  }

  return (
    <div className="fixed top-2 left-1/2 z-50 w-[calc(100%-1rem)] max-w-md -translate-x-1/2">
      <div className="rounded-box bg-error text-error-content shadow-lg">
        <div className="flex items-start gap-2">
          <button
            type="button"
            className="flex min-w-0 flex-1 flex-col items-start gap-0.5 px-3 py-2 text-left"
            onClick={() => setIsExpanded((value) => !value)}
          >
            <span className="text-sm font-semibold">{issue.title}</span>
            <span className="text-xs opacity-85">{issue.description}</span>
          </button>
          <button
            type="button"
            className="hover:bg-error-content/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
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
        >
          <div className="overflow-hidden">
            <ul className="list-disc px-7 pb-3 text-xs opacity-90">
              {issue.suggestions.map((suggestion) => (
                <li key={suggestion}>{suggestion}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
