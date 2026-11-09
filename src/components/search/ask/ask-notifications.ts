const ASK_NOTIFICATIONS_KEY = "catix-answer-notifications";

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
