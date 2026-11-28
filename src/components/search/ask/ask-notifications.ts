export const ASK_NOTIFICATIONS_KEY = "catix-answer-notifications";
// Time of the last "Not now": the hint comes back once the snooze is over
export const ASK_NOTIFICATIONS_DISMISSED_KEY =
  "catix-answer-notifications-dismissed";
const HINT_SNOOZE_MS = 60 * 60 * 1000;

export function isAskNotificationsEnabled(): boolean {
  try {
    return (
      window.isSecureContext &&
      "Notification" in window &&
      window.Notification.permission === "granted" &&
      window.localStorage.getItem(ASK_NOTIFICATIONS_KEY) === "enabled"
    );
  } catch {
    return false;
  }
}

// Whether to suggest turning the notifications on: possible, not on yet and not snoozed
export function shouldOfferAskNotifications(): boolean {
  try {
    const dismissedAt = Number(
      window.localStorage.getItem(ASK_NOTIFICATIONS_DISMISSED_KEY),
    );
    return (
      window.isSecureContext &&
      "Notification" in window &&
      window.Notification.permission !== "denied" &&
      !isAskNotificationsEnabled() &&
      Date.now() - dismissedAt > HINT_SNOOZE_MS
    );
  } catch {
    return false;
  }
}
