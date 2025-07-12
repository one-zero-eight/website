import { useMe } from "@/api/accounts/user.ts";
import { AuthWall } from "@/components/common/AuthWall.tsx";
import SearchField from "@/components/search/SearchField.tsx";
import { useNavigate } from "@tanstack/react-router";
import { ActResult } from "./ActResult";
import { $search } from "@/api/search";

export function ActPage({ actQuery }: { actQuery: string }) {
  const navigate = useNavigate();
  const { me } = useMe();

  const runSearch = (query: string) => {
    navigate({ to: "/act", search: { q: query } });
  };

  const { data: actResult } = $search.useQuery(
    "get",
    "/search/search", //TODO: Update this endpoint to the correct one for asking questions
    {
      params: { query: { query: actQuery, sources: [], response_types: [] } },
    },
    {
      enabled: actQuery.length > 0,
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
      <SearchField
        pageType="act"
        runSearch={runSearch}
        currentQuery={actQuery}
      />
      <span>AI assistant:</span>
      {actResult ? (
        <div className="flex flex-row gap-6">
          <div className="flex w-full flex-col justify-stretch gap-4 md:min-w-0">
            <ActResult response={actResult.responses[0]} />
          </div>
        </div>
      ) : (
        <span>- Sorry, I can't help you</span>
      )}
    </div>
  );
}
