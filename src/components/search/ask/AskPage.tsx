import { useMe } from "@/api/accounts/user.ts";
import { AuthWall } from "@/components/common/AuthWall.tsx";
import SearchField from "@/components/search/SearchField.tsx";
import { AskResult } from "./AskResult";
import { useState } from "react";
import { fetchAsk } from "@/api/search/ask";
import { useQueryClient } from "@tanstack/react-query";
import { searchTypes } from "@/api/search";

export function AskPage({ askQuery }: { askQuery: string }) {
  const { me } = useMe();
  const [result, setResult] = useState<searchTypes.SchemaAskResponses>();
  const [isLoading, setIsLoading] = useState(false);

  const queryClient = useQueryClient();

  const runSearch = async (query: string) => {
    setIsLoading(true);
    try {
      const data = await queryClient.fetchQuery({
        queryKey: ["ask", query],
        queryFn: () => fetchAsk(query),
      });
      setResult(data);
    } catch (error) {
      console.error("Error executing the /ask/ request:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!me) {
    return <AuthWall />;
  }

  return (
    <div className="flex grow flex-col gap-4 p-4">
      <SearchField runSearch={runSearch} currentQuery={askQuery} />
      <span className="font-semibold">AI Assistant:</span>{" "}
      {isLoading ? (
        <span>- Thinking...</span>
      ) : result ? (
        <span>- Here's what I found:</span>
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
