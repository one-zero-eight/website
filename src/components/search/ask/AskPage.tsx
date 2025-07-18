import { useMe } from "@/api/accounts/user.ts";
import { AuthWall } from "@/components/common/AuthWall.tsx";
import SearchField from "@/components/search/SearchField.tsx";
import { AskResult } from "./AskResult";
import { useNavigate } from "@tanstack/react-router";
import { $search } from "@/api/search";
import { useState } from "react";

export function AskPage({ askQuery }: { askQuery: string }) {
  const { me } = useMe();
  const navigate = useNavigate();

  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);

  const {
    data: result,
    error,
    isLoading,
  } = $search.useQuery(
    "post",
    "/ask/",
    {
      body: { query: submittedQuery ?? "" },
    },
    {
      enabled: submittedQuery !== null && submittedQuery.length > 0,
      // Disable refetch
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );

  const runSearch = (query: string) => {
    navigate({ to: "/ask", search: { q: query } });
    setSubmittedQuery(query);
  };

  if (!me) {
    return <AuthWall />;
  }

  return (
    <div className="flex grow flex-col gap-4 p-4">
      <SearchField
        runSearch={runSearch}
        currentQuery={askQuery}
        pageType="ask"
      />
      <span className="font-semibold">{"AI Assistant: "}</span>
      {isLoading ? (
        <span>Thinking...</span>
      ) : result ? (
        <></>
      ) : error ? (
        <span>- Sorry, I can't help you with this question.</span>
      ) : (
        <span>- Ask me anything!</span>
      )}
      {result && (
        <div className="flex flex-row gap-6">
          <div className="flex w-full flex-col justify-stretch gap-4 md:min-w-0">
            <AskResult response={result} />
          </div>
        </div>
      )}
    </div>
  );
}
