import type { searchTypes } from "@/api/search";
import { useEffect, useState } from "react";

// How many answers of each chat the user has seen, by chat: the answers given after that (while the user was in another
// chat or had closed the page) are shown as unread. In localStorage, so it outlives the tab
const SEEN_STORAGE_KEY = "search-ask-seen";

function readSeen(): Record<string, number> {
  return JSON.parse(localStorage.getItem(SEEN_STORAGE_KEY) ?? "{}");
}

// The unread answers of each chat that has some. The open chat is always read; a chat the page has not seen before (first
// visit, another device) starts as read, so only the answers that come later count
export function useUnreadAnswers(
  chats: searchTypes.SchemaAskChat[] | undefined,
  openChatId: string | null,
): Record<string, number> {
  const [seen, setSeen] = useState(readSeen);

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
    localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(next));
    setSeen(next);
  }, [chats, openChatId, seen]);

  return Object.fromEntries(
    (chats ?? [])
      .map(
        (chat) =>
          [
            chat.chat_id,
            chat.answer_count - (seen[chat.chat_id] ?? chat.answer_count),
          ] as const,
      )
      .filter(([chatId, unread]) => unread > 0 && chatId !== openChatId),
  );
}
