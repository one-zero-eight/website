self.addEventListener("notificationclick", (event) => {
  const notification = event.notification;
  if (notification.data?.kind !== "catix-answer") return;

  notification.close();
  event.waitUntil(
    (async () => {
      const { chatId } = notification.data;
      if (chatId !== null && typeof chatId !== "string") return;

      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const sameOriginClients = clients.filter((client) => {
        try {
          return new URL(client.url).origin === self.location.origin;
        } catch {
          return false;
        }
      });
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
    })(),
  );
});
