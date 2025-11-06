import { useMe } from "@/api/accounts/user.ts";
import { AuthWall } from "@/components/common/AuthWall.tsx";
import SearchField from "@/components/search/SearchField.tsx";
import { AskResult } from "./AskResult";
import { $search, searchTypes } from "@/api/search";
import { useEffect, useState } from "react";
import AnimatedDots from "../AnimatedDots";

type Message =
  | { role: "user"; content: string }
  | { role: "assistant"; response: searchTypes.SchemaAskResponses };

export function AskPage({ askQuery }: { askQuery: string }) {
  const { me } = useMe();

  const [inputQuery, setInputQuery] = useState(askQuery);

  const [messages, setMessages] = useState<Message[]>([]);

  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);

  const [chatId, setChatId] = useState<string | null>(null);

  const {
    data: result,
    error,
    isLoading,
  } = $search.useQuery(
    "post",
    "/ask/",
    {
      body: { query: submittedQuery ?? "", chat_id: chatId },
    },
    {
      enabled: submittedQuery !== null && submittedQuery.length > 0,
      // Disable refetch
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );

  useEffect(() => {
    if (result) {
      setMessages((prev) => [...prev, { role: "assistant", response: result }]);
      setSubmittedQuery(null);
      setChatId(result.chat_id);
    }
  }, [result, submittedQuery]);

  const runSearch = (query: string) => {
    setMessages((prev) => [...prev, { role: "user", content: query }]);
    setSubmittedQuery(query);
    setInputQuery("");
  };

  if (!me) {
    return <AuthWall />;
  }

  return (
    <div className="flex grow flex-col gap-4 p-4">
      <SearchField
        runSearch={runSearch}
        currentQuery={inputQuery}
        setCurrentQuery={setInputQuery}
        pageType="ask"
      />

      {messages.length === 0 && !isLoading && !error && (
        <div className="flex flex-col gap-4">
          <span>AI Assistant:</span>
          <span>- Ask me anything!</span>
        </div>
      )}

      {isLoading ? (
        <div className="border-inh-inactive bg-inh-primary text-base-content rounded-field flex self-start border! px-4 py-2">
          <span>- Thinking</span>
          <AnimatedDots></AnimatedDots>
        </div>
      ) : error ? (
        <div className="border-inh-inactive bg-inh-primary text-base-content rounded-field flex flex-col gap-2 self-start border! px-4 py-2">
          <span>- Sorry, I can't help you with this question.</span>
        </div>
      ) : null}

      <div className="mt-4 flex flex-col-reverse gap-6">
        {messages.map((msg, i) =>
          msg.role === "user" ? (
            <div className="flex max-w-[80%] flex-col gap-1 self-start">
              <a
                className="text-inh-inactive"
                href="https://search.innohassle.ru/dashboard"
              >
                {me.innopolis_sso?.name?.split(" ")[0]}
              </a>
              <div
                key={i}
                className="bg-inh-primary rounded-field mb-4 self-start rounded-tl-none px-4 py-2 text-white"
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
