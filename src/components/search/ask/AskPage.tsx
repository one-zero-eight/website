import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { $search, type searchTypes } from "@/api/search";
import { cn } from "@/lib/ui/cn";
import { Trans, useLingui } from "@lingui/react/macro";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import AnimatedDots from "@/components/search/AnimatedDots";
import { AskChatList } from "./AskChatList";
import { AskAttachment } from "./AskAttachment";
import { AskInput } from "./AskInput";
import { AskQuoteMenu } from "./AskQuoteMenu";
import { asQuote, splitQuote } from "./ask-quote";
import { ASK_STATUSES, moodOfStatus } from "./ask-mood";
import { formatClock, formatCountdown, usePauseSecondsLeft } from "./ask-pause";
import { AskResult } from "./AskResult";
import { AskAnswerBody } from "./AskAnswerBody";
import { SearchResults } from "./SearchResults";
import {
  askQuestion,
  openChat,
  cancelQuestion,
  dequeueQuestion,
  enqueueQuestion,
  setDraftQuery,
  setDraftAttachments,
  startNewChat,
  useAskSession,
} from "./ask-session";
import { CatIcon } from "@/components/icons/CatIcon";
import { AskNotificationHint } from "./AskNotificationHint";
import {
  SEARCH_COMMANDS,
  conversationQuestions,
  COMPLETION_WORDS,
  conversationTexts,
  exampleQuestions,
} from "./ask-suggestions";

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
  const { t, i18n } = useLingui();

  const [isChatListOpen, setIsChatListOpen] = useState(false);
  // The read-only chat of the schedule changes found in the user's study chats takes the main column
  // The list of chats beside the conversation (wide screens) can be hidden to give it room
  const [isSidebarHidden, setIsSidebarHidden] = useLocalStorage(
    "ask-chats-hidden",
    false,
  );
  const [quote, setQuote] = useState("");
  const [isNoticeDismissed, setIsNoticeDismissed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isFollowing = useRef(true);

  // The conversation stays when the user goes to another page and comes back
  const {
    messages,
    chatId,
    queue,
    answerText,
    status,
    isPending,
    error,
    assistantUnavailable,
    isOpening,
    openingError,
    draftQuery,
    draftAttachments,
    composerId,
  } = useAskSession();
  // The assistant stopped answering this user for a while: the box stays closed until the pause is over
  const { data: pause } = $search.useQuery("get", "/ask/pause");
  const pausedUntil = pause?.paused_until
    ? Date.parse(pause.paused_until)
    : null;
  const pauseSecondsLeft = usePauseSecondsLeft(pausedUntil);
  const countdown = formatCountdown(pauseSecondsLeft);
  const resumeTime = pausedUntil ? formatClock(pausedUntil, i18n.locale) : "";

  // Hints for the message box: this chat first, then examples and commands
  const suggestions = useMemo(
    () => [
      ...conversationQuestions(messages),
      ...exampleQuestions.map((m) => i18n._(m)),
      ...SEARCH_COMMANDS,
      ...COMPLETION_WORDS,
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [messages, i18n.locale],
  );

  // Words of the answers and sources in this chat, which the user's words are finished from
  const context = useMemo(() => conversationTexts(messages), [messages]);

  // A quote belongs to the chat it was taken from
  useEffect(() => setQuote(""), [composerId]);

  // A dismissed notice comes back with the next outage
  useEffect(() => {
    if (!assistantUnavailable) setIsNoticeDismissed(false);
  }, [assistantUnavailable]);

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
    const parts = splitQuote(cancelQuestion());
    if (parts.quote && !draftQuery.trim()) {
      setQuote(parts.quote);
      setDraftQuery(parts.rest);
    }
  };

  // The quote stays above the box, apart from the text the user edits, and goes before the question
  const handleQuote = (text: string) => {
    setQuote((quote) => (quote ? `${quote}\n\n${text}` : text));
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSend = (query: string) => {
    isFollowing.current = true;

    const fullQuery = quote ? `${asQuote(quote)}\n\n${query}` : query;
    if (isPending) enqueueQuestion(fullQuery);
    else askQuestion(fullQuery);
    setQuote("");
  };

  const isEmpty =
    messages.length === 0 && !isPending && !isOpening && !openingError;
  const lastMessage = messages.at(-1);

  return (
    <div className="flex min-h-0 grow">
      {!isSidebarHidden && (
        <aside className="border-base-300 hidden w-64 shrink-0 flex-col gap-1 overflow-y-auto border-r p-2 @4xl/content:flex">
          <div className="flex items-center justify-end gap-1">
            {!isEmpty && <NewChatButton className="grow justify-start" />}
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-square"
              title={t`Hide chats`}
              onClick={() => setIsSidebarHidden(true)}
            >
              <span className="icon-[material-symbols--left-panel-close-outline] text-lg" />
            </button>
          </div>
          <AskChatList />
        </aside>
      )}

      <div className="flex min-h-0 min-w-0 grow flex-col">
        {assistantUnavailable && !isNoticeDismissed && (
          <div
            role="alert"
            className="alert alert-warning justify-center rounded-none py-2 text-center"
          >
            <span className="icon-[material-symbols--warning-outline-rounded] text-xl" />
            <span>
              <Trans>
                The assistant is temporarily unavailable. Questions are answered
                by search: you can also start a message with /search or /поиск.
              </Trans>
            </span>
            <button
              type="button"
              title={t`Close`}
              aria-label={t`Close`}
              className="btn btn-circle btn-ghost btn-sm"
              onClick={() => setIsNoticeDismissed(true)}
            >
              ✕
            </button>
          </div>
        )}
        {isSidebarHidden && (
          <div className="border-base-300 hidden items-center gap-2 border-b px-4 py-2 @4xl/content:flex">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setIsSidebarHidden(false)}
            >
              <span className="icon-[material-symbols--left-panel-open-outline] text-lg" />
              <Trans>Chats</Trans>
            </button>
            {!isEmpty && <NewChatButton />}
          </div>
        )}
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
            {!isEmpty && <NewChatButton />}
          </div>
          {isChatListOpen && (
            <div className="flex max-h-64 flex-col gap-1 overflow-y-auto pt-2">
              <AskChatList onSelect={() => setIsChatListOpen(false)} />
            </div>
          )}
        </div>

        <>
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex min-h-0 grow flex-col overflow-y-auto"
          >
            <div className="mx-auto flex w-full max-w-4xl grow flex-col gap-4 p-4">
              {isEmpty && (
                <div className="flex grow flex-col items-center justify-center gap-2 text-center">
                  <CatIcon title="cAtIx" className="size-12" />
                  <span className="text-base-content/70">
                    <Trans>
                      I can help with your schedule, university rules,
                      announcements and available rooms.
                    </Trans>
                  </span>
                  {!draftQuery.trim() && draftAttachments.length === 0 && (
                    <>
                      <div className="mt-2 grid w-full max-w-2xl grid-cols-1 gap-2 @2xl/content:grid-cols-2">
                        {exampleQuestions
                          .map((m) => i18n._(m))
                          .map((query) => (
                            <button
                              key={query}
                              type="button"
                              className="btn btn-outline h-auto justify-start py-3 text-left font-normal whitespace-normal"
                              onClick={() => {
                                setDraftQuery(query);
                                inputRef.current?.focus();
                              }}
                            >
                              {query}
                            </button>
                          ))}
                      </div>
                      <p className="text-base-content/60 mt-2 max-w-2xl text-sm">
                        <Trans>
                          You can attach up to 3 PDF, TXT or image files, up to
                          10 MiB each.
                        </Trans>
                      </p>
                      <p className="text-base-content/60 max-w-2xl text-sm">
                        <Trans>
                          To search without the assistant, start a message with
                          /search or /поиск.
                        </Trans>
                      </p>
                      <p className="text-base-content/60 max-w-2xl text-sm">
                        <Trans>
                          The assistant asks for confirmation before changing
                          data in services.
                        </Trans>
                      </p>
                    </>
                  )}
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
                  {chatId && !isOpening && (
                    <button
                      type="button"
                      className="btn btn-sm self-start"
                      onClick={() => void openChat(chatId)}
                    >
                      <Trans>Retry</Trans>
                    </button>
                  )}
                </div>
              )}

              {messages.map((message, i) =>
                message.role === "user" ? (
                  <UserMessage
                    key={`${chatId}:${i}`}
                    text={message.content}
                    attachments={message.attachments}
                  />
                ) : message.role === "search" ? (
                  <SearchResults
                    key={`${chatId}:${i}`}
                    query={message.query}
                    results={message.results}
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
                <div className="flex max-w-full min-w-0 items-end gap-2 self-start">
                  <CatIcon mood={moodOfStatus(status)} className="size-10" />
                  <div className="border-base-300 bg-base-200 text-base-content rounded-field flex min-w-0 flex-col gap-2 border! px-4 py-2 wrap-anywhere">
                    {answerText && <AskAnswerBody text={answerText} />}
                    <div className="text-base-content/70 flex text-sm">
                      <span>
                        {status
                          ? i18n._(ASK_STATUSES[status].label)
                          : answerText
                            ? t`Receiving answer`
                            : t`Sending request`}
                      </span>
                      <AnimatedDots />
                    </div>
                  </div>
                </div>
              )}
              {queue.map((question, i) => (
                <UserMessage
                  key={`${chatId}:queue:${i}`}
                  text={question}
                  onRemove={() => dequeueQuestion(i)}
                />
              ))}
              {!isPending && error && (
                <div className="flex max-w-full min-w-0 items-end gap-2 self-start">
                  <CatIcon mood="error" />
                  <div className="border-base-300 bg-base-200 text-base-content rounded-field flex min-w-0 flex-col gap-2 border! px-4 py-2">
                    <span>
                      <Trans>Could not complete the request.</Trans>
                    </span>
                    <span className="text-base-content/60 text-sm">
                      {formatApiErrorMessage(error)}
                    </span>
                    {lastMessage?.role === "user" && draftQuery.trim() && (
                      <span className="text-sm">
                        <Trans>
                          Your draft is below. You can edit it and send it
                          again.
                        </Trans>
                      </span>
                    )}
                    {lastMessage?.role === "assistant" &&
                      lastMessage.response.approval && (
                        <span className="text-sm">
                          <Trans>
                            The action result could not be confirmed. Check the
                            service before trying again.
                          </Trans>
                        </span>
                      )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <AskQuoteMenu containerRef={scrollRef} onQuote={handleQuote} />

          <div className="mx-auto w-full max-w-4xl px-4 pt-2 pb-4">
            {pauseSecondsLeft > 0 ? (
              <div className="border-base-300 bg-base-200 rounded-field flex items-center gap-3 border p-3">
                <CatIcon mood="banned" className="size-10" />
                <div className="flex flex-col">
                  <span className="font-medium">
                    <Trans>Access to the assistant is paused</Trans>
                  </span>
                  <span className="text-base-content/70 text-sm">
                    <Trans>
                      You can write again at {resumeTime}, in {countdown}
                    </Trans>
                  </span>
                </div>
              </div>
            ) : (
              <>
                {isPending && <AskNotificationHint />}
                <AskInput
                  key={composerId}
                  inputRef={inputRef}
                  text={draftQuery}
                  setText={setDraftQuery}
                  suggestions={suggestions}
                  context={context}
                  quote={quote}
                  onQuoteRemove={() => setQuote("")}
                  attachments={isPending ? [] : draftAttachments}
                  onAttachmentsChange={(attachments) =>
                    setDraftAttachments(attachments, composerId)
                  }
                  onSend={handleSend}
                  onStop={handleStop}
                  isPending={isPending}
                />
              </>
            )}
          </div>
        </>
      </div>
    </div>
  );
}

// Starts a conversation in which the assistant does not see the earlier questions
function NewChatButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={cn("btn btn-ghost btn-sm", className)}
      onClick={() => {
        startNewChat();
      }}
    >
      <span className="icon-[material-symbols--add-rounded] text-lg" />
      <Trans>New</Trans>
    </button>
  );
}

function UserMessage({
  text,
  attachments,
  onRemove,
}: {
  text: string;
  attachments?: searchTypes.SchemaAttachmentInfo[];
  // A question waiting in the queue can be taken out of it
  onRemove?: () => void;
}) {
  const { t } = useLingui();
  const { quote, rest } = splitQuote(text);
  return (
    // The global selection colour is the primary one, invisible on this primary background
    <div
      className={cn(
        "bg-primary text-primary-content selection:bg-primary-content/30 rounded-field max-w-[80%] min-w-0 self-end rounded-br-none px-4 py-2 wrap-anywhere whitespace-pre-wrap",
        onRemove && "flex items-start gap-2 opacity-60",
      )}
    >
      <div className="min-w-0 grow">
        {quote && (
          <div className="border-primary-content/40 text-primary-content/70 mb-2 border-l-2 pl-2 text-sm">
            {quote}
          </div>
        )}
        {rest}
        {attachments && attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {attachments.map((attachment) => (
              <AskAttachment key={attachment.id} attachment={attachment} />
            ))}
          </div>
        )}
      </div>
      {onRemove && (
        <button
          type="button"
          className="btn btn-ghost btn-circle btn-xs"
          title={t`Remove from the queue`}
          onClick={onRemove}
        >
          <span className="icon-[material-symbols--close-rounded]" />
        </button>
      )}
    </div>
  );
}
