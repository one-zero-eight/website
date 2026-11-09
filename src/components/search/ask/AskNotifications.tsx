import { useToast } from "@/components/toast";
import { useLingui } from "@lingui/react/macro";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { isAskNotificationsEnabled } from "./ask-notifications";
import { askAnswerReadyEvent, type AskAnswerReady } from "./ask-session";

// Mounted above the routes: leaving the chat must not lose the completion event.
export function AskNotifications() {
  const { t } = useLingui();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const pathname = useLocation({ select: (location) => location.pathname });

  useEffect(() => {
    let active = true;
    const notifications = new Set<Notification>();

    function openChat(chatId: string | null) {
      void navigate({
        to: "/search/ask",
        search: chatId ? { chat: chatId } : {},
      });
    }

    async function showSystemNotification(
      chatId: string | null,
      title: string,
    ) {
      try {
        if (!isAskNotificationsEnabled()) return;
        const registration = await navigator.serviceWorker?.getRegistration();
        if (!active || !isAskNotificationsEnabled()) return;
        if (document.visibilityState === "visible" && document.hasFocus())
          return;
        const options: NotificationOptions = {
          body: t`Open the chat to read the reply.`,
          icon: "/catix-notification.png",
          tag: `catix-answer-${chatId ?? "current"}`,
          data: { kind: "catix-answer", chatId },
        };
        if (registration?.active) {
          await registration.showNotification(title, options);
          return;
        }
        // Development and desktop browsers without an active service worker.
        const notification = new Notification(title, options);
        notifications.add(notification);
        notification.onclick = () => {
          window.focus();
          openChat(chatId);
          notification.close();
          notifications.delete(notification);
        };
        notification.onclose = () => notifications.delete(notification);
      } catch (error) {
        // Notification delivery is optional; it must never fail the saved answer.
        console.warn("Could not show the cAtIx reply notification", error);
      }
    }

    function handleAnswer(event: Event) {
      const { chatId, needsApproval } = (event as CustomEvent<AskAnswerReady>)
        .detail;
      const title = needsApproval
        ? t`cAtIx is waiting for confirmation`
        : t`cAtIx replied`;
      if (document.visibilityState !== "visible" || !document.hasFocus()) {
        void showSystemNotification(chatId, title);
        return;
      }
      if (pathname.replace(/\/$/, "") === "/search/ask") return;
      showToast({
        type: "info",
        title,
        duration: 10000,
        action: {
          label: t`Open chat`,
          onClick: () => openChat(chatId),
        },
      });
    }

    function handleWorkerMessage(event: MessageEvent) {
      const data = event.data;
      if (data?.type !== "catix-open-chat") return;
      if (data.chatId !== null && typeof data.chatId !== "string") return;
      openChat(data.chatId);
    }

    window.addEventListener(askAnswerReadyEvent, handleAnswer);
    navigator.serviceWorker?.addEventListener("message", handleWorkerMessage);
    return () => {
      active = false;
      window.removeEventListener(askAnswerReadyEvent, handleAnswer);
      navigator.serviceWorker?.removeEventListener(
        "message",
        handleWorkerMessage,
      );
      notifications.forEach((notification) => notification.close());
    };
  }, [navigate, pathname, showToast, t]);

  return null;
}
