import { $search } from "@/api/search";
import { useLocation } from "@tanstack/react-router";
import { useAskSession } from "./ask-session";
import { useUnreadAnswers } from "./ask-unread";

// The number of answers the user has not seen yet, in all chats, next to the assistant in the menu
export function AskUnreadBadge() {
  const { chatId } = useAskSession();
  const isOnAskPage = useLocation({
    select: (location) => location.pathname.startsWith("/search/ask"),
  });
  const { data: chats } = $search.useQuery("get", "/ask/chats", undefined, {
    refetchInterval: (query) =>
      query.state.data?.some((chat) => chat.answering) ? 5000 : false,
  });
  // The chat on the screen is read; away from the assistant's page every chat counts
  const unread = useUnreadAnswers(chats, isOnAskPage ? chatId : null);
  const total = Object.values(unread).reduce((sum, count) => sum + count, 0);
  if (total === 0) return null;
  return (
    <span className="badge badge-primary badge-sm ml-2 shrink-0">{total}</span>
  );
}
