import { $search, searchTypes } from "@/api/search";
import {
  formatApiErrorDescriptor,
  formatApiErrorMessage,
} from "@/api/helpers/create-query-client";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/ui/cn";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { forgetChat, openChat, useAskSession } from "./ask-session";

// The API takes at most this many characters in a chat's name
const TITLE_MAX_LENGTH = 200;

// The user's chats with the assistant, the last answered first: one opens with its questions and answers to go on with it
export function AskChatList({ onSelect }: { onSelect?: () => void }) {
  const { chatId } = useAskSession();
  const [retryError, setRetryError] = useState<unknown>(null);
  const {
    data: chats,
    isPending,
    error,
    refetch,
    isFetching,
  } = $search.useQuery("get", "/ask/chats");

  if (error || retryError) {
    return (
      <div className="flex flex-col items-start gap-2 px-3 text-sm">
        <span className="text-error">
          {formatApiErrorMessage(error || retryError)}
        </span>
        <button
          type="button"
          className="btn btn-sm"
          disabled={isFetching}
          onClick={() => {
            setRetryError(error);
            void refetch().finally(() => setRetryError(null));
          }}
        >
          {isFetching && (
            <span className="loading loading-spinner loading-sm" />
          )}
          <Trans>Retry</Trans>
        </button>
      </div>
    );
  }
  if (isPending) {
    return (
      <div className="flex flex-col gap-1">
        <div className="skeleton h-7 w-full" />
        <div className="skeleton h-7 w-full" />
        <div className="skeleton h-7 w-full" />
      </div>
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
        <AskChatItem
          key={chat.chat_id}
          chat={chat}
          isOpen={chat.chat_id === chatId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

// A chat in the list: a click opens it, the pencil renames it (the model named it by its first question; after the user's
// name the model does not name it again), the bin deletes it with the assistant's memory of it
function AskChatItem({
  chat,
  isOpen,
  onSelect,
}: {
  chat: searchTypes.SchemaAskChat;
  isOpen: boolean;
  onSelect?: () => void;
}) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const { showError } = useToast();
  const [editedTitle, setEditedTitle] = useState<string | null>(null);

  const rename = $search.useMutation("patch", "/ask/chats/{chat_id}", {
    onSuccess: (renamed) => {
      queryClient.setQueryData(
        $search.queryOptions("get", "/ask/chats").queryKey,
        (chats) =>
          chats?.map((c) => (c.chat_id === renamed.chat_id ? renamed : c)),
      );
    },
    onError: (error) => {
      showError(
        msg`Could not rename the chat`,
        formatApiErrorDescriptor(error),
      );
    },
  });

  const remove = $search.useMutation("delete", "/ask/chats/{chat_id}", {
    onSuccess: () => {
      forgetChat(chat.chat_id);
      queryClient.setQueryData(
        $search.queryOptions("get", "/ask/chats").queryKey,
        (chats) => chats?.filter((c) => c.chat_id !== chat.chat_id),
      );
      queryClient.removeQueries({
        queryKey: $search.queryOptions("get", "/ask/chats/{chat_id}", {
          params: { path: { chat_id: chat.chat_id } },
        }).queryKey,
      });
    },
    onError: (error) => {
      showError(
        msg`Could not delete the chat`,
        formatApiErrorDescriptor(error),
      );
    },
  });

  // A question of the chat being answered is cancelled by the server
  const handleDelete = () => {
    const title = chat.title;
    if (
      !window.confirm(
        t`Delete the chat "${title}"? Its questions and answers cannot be restored.`,
      )
    ) {
      return;
    }
    remove.mutate({ params: { path: { chat_id: chat.chat_id } } });
  };

  const handleSave = () => {
    const title = editedTitle?.trim();
    setEditedTitle(null);
    if (!title || title === chat.title) return;
    rename.mutate({
      params: { path: { chat_id: chat.chat_id } },
      body: { title },
    });
  };

  if (editedTitle !== null) {
    return (
      <input
        type="text"
        autoFocus
        value={editedTitle}
        maxLength={TITLE_MAX_LENGTH}
        placeholder={t`Chat name`}
        className="input input-sm w-full"
        onChange={(e) => setEditedTitle(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          } else if (e.key === "Escape") {
            setEditedTitle(null);
          }
        }}
      />
    );
  }

  return (
    <div
      className={cn(
        "group rounded-field hover:bg-base-200 flex items-center",
        isOpen && "bg-base-200 font-medium",
      )}
    >
      <button
        type="button"
        className="min-w-0 grow truncate px-3 py-1.5 text-left text-sm"
        onClick={() => {
          openChat(chat.chat_id);
          onSelect?.();
        }}
      >
        {rename.isPending ? rename.variables.body.title : chat.title}
      </button>
      {rename.isPending || remove.isPending ? (
        <span className="loading loading-spinner loading-xs mx-2 shrink-0" />
      ) : (
        <>
          <button
            type="button"
            title={t`Rename`}
            className={cn(
              "btn btn-ghost btn-xs btn-square shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
              isOpen && "opacity-100",
            )}
            onClick={() => setEditedTitle(chat.title)}
          >
            <span className="icon-[material-symbols--edit-outline-rounded]" />
          </button>
          <button
            type="button"
            title={t`Delete`}
            className={cn(
              "btn btn-ghost btn-xs btn-square hover:text-error mr-1 shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
              isOpen && "opacity-100",
            )}
            onClick={handleDelete}
          >
            <span className="icon-[material-symbols--delete-outline-rounded]" />
          </button>
        </>
      )}
    </div>
  );
}
