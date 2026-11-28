import { Trans, useLingui } from "@lingui/react/macro";
import { useState } from "react";
import {
  ASK_NOTIFICATIONS_DISMISSED_KEY,
  ASK_NOTIFICATIONS_KEY,
  shouldOfferAskNotifications,
} from "./ask-notifications";

// A suggestion to get a notification when the answer is ready, shown above the input while the answer is pending
export function AskNotificationHint() {
  const { t } = useLingui();
  const [visible, setVisible] = useState(shouldOfferAskNotifications);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  if (!visible) return null;

  async function handleEnable() {
    setPending(true);
    setError("");
    try {
      // Call the browser prompt directly inside the click gesture.
      const permission =
        window.Notification.permission === "default"
          ? await window.Notification.requestPermission()
          : window.Notification.permission;
      if (permission === "granted") {
        window.localStorage.setItem(ASK_NOTIFICATIONS_KEY, "enabled");
      }
      // A dismissed browser prompt keeps the hint, a block or a grant closes it
      if (permission !== "default") setVisible(false);
    } catch {
      setError(t`Could not update notification settings. Please try again.`);
    } finally {
      setPending(false);
    }
  }

  function handleDismiss() {
    try {
      window.localStorage.setItem(
        ASK_NOTIFICATIONS_DISMISSED_KEY,
        String(Date.now()),
      );
    } catch {
      // The hint is still hidden until the page is reloaded
    }
    setVisible(false);
  }

  return (
    <div className="border-base-300 bg-base-200 rounded-field mb-2 flex flex-wrap items-center gap-2 border px-3 py-2 text-sm">
      <span>
        <Trans>Get a notification when catix replies?</Trans>
      </span>
      <button
        type="button"
        className="btn btn-primary btn-xs"
        disabled={pending}
        onClick={handleEnable}
      >
        {pending && <span className="loading loading-spinner loading-xs" />}
        <Trans>Enable</Trans>
      </button>
      <button
        type="button"
        className="btn btn-ghost btn-xs"
        onClick={handleDismiss}
      >
        <Trans>Not now</Trans>
      </button>
      {error && <p className="text-error w-full text-xs">{error}</p>}
    </div>
  );
}
