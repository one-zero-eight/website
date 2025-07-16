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

  const {
    data: result,
    isLoading,
    error,
  } = $search.useQuery(
    "post",
    "/act/",
    {
      body: { query: actQuery },
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
      <span className="font-semibold">AI assistant:</span>
      {isLoading ? (
        <span>- Executing...</span>
      ) : result ? (
        <div className="flex flex-row gap-6">
          <div className="flex w-full flex-col justify-stretch gap-4 md:min-w-0">
            <ActResult response={result} />
          </div>
        </div>
      ) : error ? (
        <span>- Sorry, I can't help you with this question.</span>
      ) : (
        <>
          <div className="flex flex-row gap-1">
            <div>-</div>
            <div className="flex flex-col gap-1">
              <span>Hi! I'm AI assistant.</span>
              <span>I can help you to book the music room.</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
