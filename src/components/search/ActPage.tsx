import { useMe } from "@/api/accounts/user.ts";
import { $search, searchTypes } from "@/api/search";
import { AuthWall } from "@/components/common/AuthWall.tsx";
import PreviewCard from "@/components/search/PreviewCard.tsx";
import SearchField from "@/components/search/SearchField.tsx";
import SearchResult from "@/components/search/SearchResult.tsx";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export function ActPage({ searchQuery }: { searchQuery: string }) {
  const navigate = useNavigate();
  const { me } = useMe();

  const [previewSource, setPreviewSource] =
    useState<searchTypes.SchemaSearchResponse["source"]>();

  const { data: searchResult } = $search.useQuery(
    "get",
    "/search/search",
    {
      params: { query: { query: searchQuery } },
    },
    {
      enabled: searchQuery.length > 0,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );

  useEffect(() => {
    setPreviewSource(searchResult?.responses[0]?.source);
  }, [searchResult]);

  const runSearch = (query: string) => {
    navigate({ to: "/act", search: { q: query } });
  };

  if (!me) {
    return <AuthWall />;
  }

  return (
    <div className="flex grow flex-col gap-4 p-4">
      <SearchField runSearch={runSearch} currentQuery={searchQuery} />

      {searchResult && (
        <p className="py-4 text-2xl font-semibold text-contrast">
          {searchResult.responses.length > 0
            ? `Actions for: ${searchResult.searched_for}`
            : `No matched actions for: ${searchResult.searched_for}`}
        </p>
      )}

      {searchResult && (
        <div className="flex flex-row gap-6">
          <div className="flex w-full flex-col justify-stretch gap-4 md:min-w-0 md:basis-1/2">
            {searchResult.responses.map((response, i) => (
              <SearchResult
                key={i}
                response={response}
                isSelected={previewSource === response.source}
                select={() => setPreviewSource(response.source)}
              />
            ))}
          </div>
          {previewSource && (
            <PreviewCard
              source={previewSource}
              onClose={() => setPreviewSource(undefined)}
            />
          )}
        </div>
      )}
    </div>
  );
}
