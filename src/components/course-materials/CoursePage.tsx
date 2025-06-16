import { useMe } from "@/api/accounts/user.ts";
import { $search, searchTypes } from "@/api/search";
import { AuthWall } from "@/components/common/AuthWall.tsx";
import PreviewCard from "@/components/course-materials/preview/PreviewCard";
import SearchResult from "@/components/course-materials/SearchResult.tsx";
import { useEffect, useState } from "react";

export function CoursePage({ course }: { course: string }) {
  const { me } = useMe();

  const [previewSource, setPreviewSource] =
    useState<searchTypes.SchemaSearchResponse["source"]>();

  const { data: searchResult } = $search.useQuery(
    "get",
    "/search/search",
    {
      params: { query: { query: course } },
    },
    {
      enabled: course.length > 0,
      // Disable refetch
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );

  useEffect(() => {
    // Reset preview source when search result changes
    setPreviewSource(searchResult?.responses[0]?.source);
  }, [searchResult]);

  if (!me) {
    return <AuthWall />;
  }

  return (
    <div className="flex grow flex-col gap-4 p-4">
      {searchResult && (
        <p className="py-4 text-2xl font-semibold text-contrast">
          {searchResult.responses.length > 0
            ? `${searchResult.searched_for}`
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
