import { Trans, useLingui } from "@lingui/react/macro";
import { useEffect, useRef, useState } from "react";
import { isAskNotificationsEnabled } from "./ask-notifications";

const ASK_NOTIFICATIONS_KEY = "catix-answer-notifications";

export function AskNotificationButton() {
  const { t } = useLingui();
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    "Notification" in window && window.Notification
      ? window.Notification.permission
      : "denied",
  );
  const [enabled, setEnabled] = useState(isAskNotificationsEnabled);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);

  useEffect(() => {
    function refresh() {
      if (!("Notification" in window) || !window.Notification) return;
      setPermission(window.Notification.permission);
      setEnabled(isAskNotificationsEnabled());
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === ASK_NOTIFICATIONS_KEY || event.key === null) refresh();
    }

    window.addEventListener("focus", refresh);
    window.addEventListener("storage", handleStorage);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  if (
    !("Notification" in window) ||
    !window.Notification ||
    !window.isSecureContext
  )
    return null;

  const deniedMessage =
    permission === "denied"
      ? t`Notifications are blocked. Allow them in your browser settings.`
      : "";

  async function handleClick() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");

    try {
      if (isAskNotificationsEnabled()) {
        window.localStorage.removeItem(ASK_NOTIFICATIONS_KEY);
        setEnabled(false);
        return;
      }

      let currentPermission = window.Notification.permission;
      if (currentPermission === "denied") {
        setPermission(currentPermission);
        return;
      }
      if (currentPermission === "default") {
        // Call the browser prompt synchronously inside the click gesture.
        currentPermission = await window.Notification.requestPermission();
        setPermission(currentPermission);
      }
      if (currentPermission !== "granted") return;

      window.localStorage.setItem(ASK_NOTIFICATIONS_KEY, "enabled");
      setEnabled(true);
    } catch {
      setError(t`Could not update notification settings. Please try again.`);
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-col items-start gap-1">
      <button
        type="button"
        className="btn btn-ghost btn-sm min-h-8 gap-1.5 px-2 text-xs"
        disabled={pending || permission === "denied"}
        title={
          deniedMessage ||
          (enabled
            ? t`Turn off reply notifications`
            : t`Notify me when cAtIx replies`)
        }
        onClick={handleClick}
      >
        <span className="icon-[material-symbols--notifications-outline] shrink-0 text-base" />
        {enabled ? (
          <Trans>Notifications on</Trans>
        ) : (
          <Trans>Notify me when cAtIx replies</Trans>
        )}
      </button>
      {deniedMessage && (
        <p className="text-error max-w-64 text-xs leading-snug">
          {deniedMessage}
        </p>
      )}
      {error && <p className="text-error text-xs leading-snug">{error}</p>}
    </div>
  );
}
