import PreviewCard from "@/components/search/PreviewCard.tsx";
import SearchField from "@/components/search/SearchField.tsx";
import SearchResult from "@/components/search/SearchResult.tsx";
import { search } from "@/lib/search";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export function SearchPage({ searchQuery }: { searchQuery: string }) {
  const navigate = useNavigate();

  const [previewSource, setPreviewSource] =
    useState<search.SearchResponseSource>();

  const { data: searchResult } = search.useSearchSearchByQuery(
    { query: searchQuery },
    {
      query: {
        enabled: searchQuery.length > 0,
        // Disable refetch
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
    },
  );

  useEffect(() => {
    // Reset preview source when search result changes
    setPreviewSource(searchResult?.responses[0]?.source);
  }, [searchResult]);

  const runSearch = (query: string) => {
    navigate({ to: "/search", search: { q: query } });
  };

  return (
    <div className="mt-4 flex grow flex-col gap-4">
      <SearchField runSearch={runSearch} currentQuery={searchQuery} />

      {searchResult && (
        <p className="py-4 text-2xl font-semibold text-text-main">
          {searchResult.responses.length > 0
            ? `Results for: ${searchResult.searched_for}`
            : `No matched results for: ${searchResult.searched_for}`}
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
