import { useMe } from "@/api/accounts/user.ts";
import { $search } from "@/api/search";
import { AuthWall } from "@/components/common/AuthWall.tsx";
import SearchField from "@/components/search/SearchField.tsx";
import { useNavigate } from "@tanstack/react-router";
import { AskResult } from "./AskResult";

export function AskPage({ askQuery }: { askQuery: string }) {
  const navigate = useNavigate();
  const { me } = useMe();

  const runSearch = (query: string) => {
    navigate({ to: "/ask", search: { q: query } });
  };

  const { data: askResult } = $search.useQuery(
    "get",
    "/search/search", //TODO: Update this endpoint to the correct one for ask
    {
      params: { query: { query: askQuery, sources: [], response_types: [] } },
    },
    {
      enabled: askQuery.length > 0,
      // Disable refetch
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );

  if (!me) {
    return <AuthWall />;
  }

  return (
    <div className="flex grow flex-col gap-4 p-4">
      <SearchField runSearch={runSearch} currentQuery={askQuery} />
      <span>AI assistant:</span>
      {askResult ? (
        <span>- Here, what I found...</span>
      ) : (
        <span>- Sorry, I can't answer</span>
      )}
      {askResult && (
        <div className="flex flex-row gap-6">
          <div className="flex w-full flex-col justify-stretch gap-4 md:min-w-0">
            <AskResult response={askResult.responses[0]} />
          </div>
        </div>
      )}
    </div>
  );
}
