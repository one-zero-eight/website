import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import type { searchTypes } from "@/api/search";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { useEffect, useRef, useState } from "react";
import AnimatedDots from "@/components/search/AnimatedDots";
import { AskSources } from "./AskSources";
import { AskChatList } from "./AskChatList";
import { AskAttachment } from "./AskAttachment";
import { AskInput } from "./AskInput";
import { AskNotificationButton } from "./AskNotificationButton";
import { AskResult } from "./AskResult";
import {
  askQuestion,
  openChat,
  cancelQuestion,
  setDraftQuery,
  setDraftAttachments,
  useAskSession,
} from "./ask-session";

// How close to the end the chat must be scrolled to follow a new answer as it is written
const FOLLOW_DISTANCE_PX = 80;

// A chat as in messengers: the earlier messages above, the newest at the bottom over the message box
export function AskPage({
  askQuery,
  askChat,
  onChatLinkHandled,
}: {
  askQuery: string;
  askChat?: string;
  onChatLinkHandled?: () => void;
}) {
  useLingui();

  const [isChatListOpen, setIsChatListOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isFollowing = useRef(true);

  // The conversation stays when the user goes to another page and comes back
  const {
    messages,
    chatId,
    answerText,
    status,
    isPending,
    error,
    isOpening,
    openingError,
    draftQuery,
    draftAttachments,
    composerId,
  } = useAskSession();

  useEffect(() => {
    if (askQuery) setDraftQuery(askQuery);
  }, [askQuery]);

  useEffect(() => {
    if (!askChat) return;
    // A notification for this chat must not cancel a newer answer in progress.
    if (askChat !== chatId) void openChat(askChat);
    // Consume the link so choosing another chat does not reopen this one.
    onChatLinkHandled?.();
  }, [askChat, chatId, onChatLinkHandled]);

  // Follow the chat to its end while the user has not scrolled up to read
  useEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll || !isFollowing.current) return;
    scroll.scrollTop = scroll.scrollHeight;
  }, [messages, answerText, status, error, isOpening]);

  const handleScroll = () => {
    const scroll = scrollRef.current;
    if (!scroll) return;
    isFollowing.current =
      scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight <
      FOLLOW_DISTANCE_PX;
  };

  // A stopped question comes back to the box, unless the user is already writing another one
  const handleStop = () => {
    cancelQuestion();
  };

  const handleSend = (query: string) => {
    isFollowing.current = true;

    askQuestion(query);
  };

  const isEmpty =
    messages.length === 0 && !isPending && !isOpening && !openingError;

  return (
    <div className="flex min-h-0 grow">
      <aside className="border-base-300 hidden w-64 shrink-0 flex-col overflow-y-auto border-r p-2 @4xl/content:flex">
        <AskChatList />
      </aside>

      <div className="flex min-h-0 min-w-0 grow flex-col">
        <div className="border-base-300 hidden justify-end border-b px-4 py-2 @4xl/content:flex">
          <AskSources />
        </div>
        <div className="border-base-300 flex flex-col gap-2 border-b px-4 py-2 @4xl/content:hidden">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              className="btn btn-ghost btn-sm self-start"
              onClick={() => setIsChatListOpen((open) => !open)}
            >
              <span className="icon-[material-symbols--chat-outline] text-lg" />
              <Trans>Chats</Trans>
              <span
                className={
                  isChatListOpen
                    ? "icon-[material-symbols--expand-less-rounded]"
                    : "icon-[material-symbols--expand-more-rounded]"
                }
              />
            </button>
            <AskSources />
          </div>
          {isChatListOpen && (
            <div className="max-h-64 overflow-y-auto pt-2">
              <AskChatList onSelect={() => setIsChatListOpen(false)} />
            </div>
          )}
        </div>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex min-h-0 grow flex-col overflow-y-auto"
        >
          <div className="mx-auto flex w-full max-w-4xl grow flex-col gap-4 p-4">
            {isEmpty && (
              <div className="flex grow flex-col items-center justify-center gap-2 text-center">
                <span className="text-lg font-medium">cAtIx</span>
                <span className="text-base-content/70">
                  <Trans>- Ask me anything!</Trans>
                </span>
              </div>
            )}

            {isOpening && (
              <>
                <div className="skeleton h-10 w-1/2 self-end" />
                <div className="skeleton h-24 w-3/4" />
              </>
            )}
            {openingError !== null && (
              <div className="border-base-300 bg-base-200 text-base-content rounded-field flex flex-col gap-1 self-start border! px-4 py-2">
                <Trans>Could not open the chat</Trans>
                <span className="text-base-content/60 text-sm">
                  {formatApiErrorMessage(openingError)}
                </span>
              </div>
            )}

            {messages.map((message, i) =>
              message.role === "user" ? (
                <UserMessage
                  key={`${chatId}:${i}`}
                  text={message.content}
                  attachments={message.attachments}
                />
              ) : (
                <AskResult
                  key={`${chatId}:${i}`}
                  response={message.response}
                  isLast={i === messages.length - 1}
                  isPending={isPending}
                />
              ),
            )}

            {isPending && (
              <div className="border-base-300 bg-base-200 text-base-content rounded-field flex max-w-full min-w-0 flex-col gap-2 self-start border! px-4 py-2 wrap-anywhere">
                {answerText ? (
                  <p className="whitespace-pre-wrap">{answerText}</p>
                ) : (
                  <div className="flex">
                    <span>- {status}</span>
                    <AnimatedDots></AnimatedDots>
                  </div>
                )}
              </div>
            )}
            {!isPending && error && (
              <div className="border-base-300 bg-base-200 text-base-content rounded-field flex flex-col gap-2 self-start border! px-4 py-2">
                <span>
                  <Trans>- Sorry, I can't help you with this question.</Trans>
                </span>
                <span className="text-base-content/60 text-sm">
                  {formatApiErrorMessage(error)}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="mx-auto w-full max-w-4xl px-4 pt-2 pb-4">
          <AskInput
            key={composerId}
            text={draftQuery}
            setText={setDraftQuery}
            attachments={isPending ? [] : draftAttachments}
            onAttachmentsChange={(attachments) =>
              setDraftAttachments(attachments, composerId)
            }
            onSend={handleSend}
            onStop={handleStop}
            isPending={isPending}
          />
          <div className="flex flex-wrap items-center justify-end gap-1">
            <AskNotificationButton />
          </div>
        </div>
      </div>
    </div>
  );
}

function UserMessage({
  text,
  attachments,
}: {
  text: string;
  attachments?: searchTypes.SchemaAttachmentInfo[];
}) {
  return (
    <div className="bg-primary text-primary-content rounded-field max-w-[80%] min-w-0 self-end rounded-br-none px-4 py-2 wrap-anywhere whitespace-pre-wrap">
      {text}
      {attachments && attachments.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <AskAttachment key={attachment.id} attachment={attachment} />
          ))}
        </div>
      )}
    </div>
  );
}
