import { useMe } from "@/api/accounts/user.ts";
import SearchField from "@/components/search/SearchField.tsx";
import { AskResult } from "./AskResult";
import { searchTypes } from "@/api/search";
import { useAskStream } from "./use-ask-stream";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { useState } from "react";
import AnimatedDots from "../AnimatedDots";

type Message =
  | { role: "user"; content: string }
  | { role: "assistant"; response: searchTypes.SchemaAskResponses };

export function AskPage({ askQuery }: { askQuery: string }) {
  const { me } = useMe();

  const [inputQuery, setInputQuery] = useState(askQuery);

  const [messages, setMessages] = useState<Message[]>([]);

  const [chatId, setChatId] = useState<string | null>(null);

  const { ask, cancel, answerText, status, isPending, error } = useAskStream();

  const runSearch = async (query: string) => {
    setMessages((prev) => [...prev, { role: "user", content: query }]);
    setInputQuery("");
    const response = await ask(query, chatId);
    if (!response) return;
    setMessages((prev) => [...prev, { role: "assistant", response }]);
    setChatId(response.chat_id ?? null);
  };

  return (
    <div className="flex grow flex-col gap-4 p-4">
      <SearchField
        runSearch={runSearch}
        currentQuery={inputQuery}
        setCurrentQuery={setInputQuery}
        pageType="ask"
      />

      {messages.length === 0 && !isPending && !error && (
        <div className="flex flex-col gap-4">
          <span>AI Assistant:</span>
          <span>- Ask me anything!</span>
        </div>
      )}

      {isPending ? (
        <div className="flex flex-col gap-2 self-start">
          {(answerText || status) && (
            <div className="border-base-300 bg-base-200 text-base-content rounded-field flex max-w-full flex-col gap-2 border! px-4 py-2">
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
          <button
            type="button"
            className="btn btn-ghost btn-sm self-start"
            onClick={cancel}
          >
            <span className="icon-[material-symbols--close]" />
            Cancel
          </button>
        </div>
      ) : error ? (
        <div className="border-base-300 bg-base-200 text-base-content rounded-field flex flex-col gap-2 self-start border! px-4 py-2">
          <span>- Sorry, I can't help you with this question.</span>
          <span className="text-base-content/60 text-sm">
            {formatApiErrorMessage(error)}
          </span>
        </div>
      ) : null}

      <div className="mt-4 flex flex-col-reverse gap-6">
        {messages.map((msg, i) =>
          msg.role === "user" ? (
            <div className="flex max-w-[80%] flex-col gap-1 self-start">
              <a className="text-base-content/30" href="/dashboard">
                {me?.innopolis_info?.name?.split(" ")[0]}
              </a>
              <div
                key={i}
                className="bg-base-200 rounded-field mb-4 self-start rounded-tl-none px-4 py-2 text-white"
              >
                {msg.content}
              </div>
            </div>
          ) : (
            <AskResult key={i} response={msg.response} />
          ),
        )}
      </div>
    </div>
  );
}
