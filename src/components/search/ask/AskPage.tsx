import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { useEffect, useRef, useState } from "react";
import AnimatedDots from "../AnimatedDots";
import { AskChatList } from "./AskChatList";
import { AskInput } from "./AskInput";
import { AskResult } from "./AskResult";
import { askQuestion, cancelQuestion, useAskSession } from "./ask-session";

// How close to the end the chat must be scrolled to follow a new answer as it is written
const FOLLOW_DISTANCE_PX = 80;

// A chat as in messengers: the earlier messages above, the newest at the bottom over the message box
export function AskPage({ askQuery }: { askQuery: string }) {
  useLingui();
  const [inputText, setInputText] = useState(askQuery);
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
  } = useAskSession();

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
    const question = cancelQuestion();
    if (question && !inputText.trim()) setInputText(question);
  };

  const handleSend = (query: string) => {
    isFollowing.current = true;
    setInputText("");
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
        <div className="border-base-300 flex flex-col border-b px-4 py-2 @4xl/content:hidden">
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
                <UserMessage key={`${chatId}:${i}`} text={message.content} />
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
              <div className="border-base-300 bg-base-200 text-base-content rounded-field flex max-w-full flex-col gap-2 self-start border! px-4 py-2">
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
            text={inputText}
            setText={setInputText}
            onSend={handleSend}
            onStop={handleStop}
            isPending={isPending}
          />
        </div>
      </div>
    </div>
  );
}

function UserMessage({ text }: { text: string }) {
  return (
    <div className="bg-primary text-primary-content rounded-field max-w-[80%] self-end rounded-br-none px-4 py-2 break-words whitespace-pre-wrap">
      {text}
    </div>
  );
}
