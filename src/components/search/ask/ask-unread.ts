import type { searchTypes } from "@/api/search";
import { useEffect, useSyncExternalStore } from "react";

// How many answers of each chat the user has seen, by chat: the answers given after that (while the user was in another
// chat or had closed the page) are shown as unread. In localStorage, so it outlives the tab; one copy in memory, so the
// chat list and the menu agree
const SEEN_STORAGE_KEY = "search-ask-seen";

let seen: Record<string, number> = JSON.parse(
  localStorage.getItem(SEEN_STORAGE_KEY) ?? "{}",
);
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// The unread answers of each chat that has some. `openChatId` is the chat the user is looking at: it is always read. A chat
// the page has not seen before (first visit, another device) starts as read, so only the answers that come later count
export function useUnreadAnswers(
  chats: searchTypes.SchemaAskChat[] | undefined,
  openChatId: string | null,
): Record<string, number> {
  const current = useSyncExternalStore(subscribe, () => seen);

  useEffect(() => {
    if (!chats) return;
    const next = Object.fromEntries(
      chats.map((chat) => [
        chat.chat_id,
        chat.chat_id === openChatId
          ? chat.answer_count
          : (seen[chat.chat_id] ?? chat.answer_count),
      ]),
    );
    if (JSON.stringify(next) === JSON.stringify(seen)) return;
    seen = next;
    localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(seen));
    listeners.forEach((listener) => listener());
  }, [chats, openChatId]);

  return Object.fromEntries(
    (chats ?? [])
      .map(
        (chat) =>
          [
            chat.chat_id,
            chat.answer_count - (current[chat.chat_id] ?? chat.answer_count),
          ] as const,
      )
      .filter(([chatId, unread]) => unread > 0 && chatId !== openChatId),
  );
}
