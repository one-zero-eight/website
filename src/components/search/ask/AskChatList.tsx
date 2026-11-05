import { $search } from "@/api/search";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { cn } from "@/lib/ui/cn";
import { Trans } from "@lingui/react/macro";
import { openChat, useAskSession } from "./ask-session";

// The user's chats with the assistant, the last answered first: one opens with its questions and answers to go on with it
export function AskChatList({ onSelect }: { onSelect?: () => void }) {
  const { chatId } = useAskSession();
  const {
    data: chats,
    isPending,
    error,
  } = $search.useQuery("get", "/ask/chats");

  if (isPending) {
    return (
      <div className="flex flex-col gap-1">
        <div className="skeleton h-7 w-full" />
        <div className="skeleton h-7 w-full" />
        <div className="skeleton h-7 w-full" />
      </div>
    );
  }
  if (error) {
    return (
      <span className="text-error px-3 text-sm">
        {formatApiErrorMessage(error)}
      </span>
    );
  }
  if (chats.length === 0) {
    return (
      <span className="text-base-content/60 px-3 text-sm">
        <Trans>No chats yet</Trans>
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {chats.map((chat) => (
        <button
          key={chat.chat_id}
          type="button"
          className={cn(
            "rounded-field hover:bg-base-200 truncate px-3 py-1.5 text-left text-sm",
            chat.chat_id === chatId && "bg-base-200 font-medium",
          )}
          onClick={() => {
            openChat(chat.chat_id);
            onSelect?.();
          }}
        >
          {chat.title}
        </button>
      ))}
    </div>
  );
}
