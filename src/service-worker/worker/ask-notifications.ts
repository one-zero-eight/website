/**
 * Clicks on the notifications of cAtIx answers (shown by the page, see
 * AskNotifications.tsx): bring the app to the chat the answer belongs to.
 */

declare const self: ServiceWorkerGlobalScope;

function isSameOrigin(client: WindowClient) {
  try {
    return new URL(client.url).origin === self.location.origin;
  } catch {
    return false;
  }
}

async function openChat(chatId: string | null) {
  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  const sameOriginClients = clients.filter(isSameOrigin);
  const client =
    sameOriginClients.find((candidate) => candidate.focused) ??
    sameOriginClients.find(
      (candidate) => candidate.visibilityState === "visible",
    ) ??
    sameOriginClients[0];

  if (client) {
    client.postMessage({ type: "catix-open-chat", chatId });
    await client.focus();
    return;
  }

  const destination = new URL("/search/ask", self.location.origin);
  if (chatId) {
    destination.search = new URLSearchParams({ chat: chatId }).toString();
  }
  await self.clients.openWindow(destination.href);
}

export function handleAskNotificationClick(event: NotificationEvent) {
  const notification = event.notification;
  if (notification.data?.kind !== "catix-answer") return;

  notification.close();
  const { chatId } = notification.data;
  if (chatId !== null && typeof chatId !== "string") return;
  event.waitUntil(openChat(chatId));
}
