import { useMe } from "@/api/accounts/user.ts";
import { $search, searchTypes } from "@/api/search";
import { AuthWall } from "@/components/common/AuthWall.tsx";
import PreviewCard from "@/components/search/PreviewCard.tsx";
import SearchField from "@/components/search/SearchField.tsx";
import SearchResult from "@/components/search/SearchResult.tsx";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  InfoSources,
  PathsSearchSearchGetParametersQueryResponse_types,
} from "@/api/search/types";

export function SearchPage({ searchQuery }: { searchQuery: string }) {
  const navigate = useNavigate();
  const { me } = useMe();

  const [previewSource, setPreviewSource] =
    useState<searchTypes.SchemaSearchResponse["source"]>();

  const initialFiltersState = {
    fileType: {
      pdf: true,
      link_to_source: true,
    },
    source: {
      campuslife: true,
      eduwiki: true,
      hotel: true,
      moodle: true,
      maps: true,
      residents: true,
    },
  };

  const [appliedFilters, setAppliedFilters] =
    useState<Record<string, Record<string, boolean>>>(initialFiltersState);
  const [selectedFilters, setSelectedFilters] =
    useState<Record<string, Record<string, boolean>>>(initialFiltersState);

  const checks = (group: string, value: string) => {
    setSelectedFilters((prev) => ({
      ...prev,
      [group]: {
        ...prev[group],
        [value]: !prev[group][value],
      },
    }));
  };

  const buildQueryFilters = (
    selected: Record<string, Record<string, boolean>>,
  ) => {
    const response_types: PathsSearchSearchGetParametersQueryResponse_types[] =
      [];
    const sources: InfoSources[] = [];
    const query_categories: string[] = [];

    if (!selected.fileType.pdf && !selected.fileType.link_to_source) {
      response_types.push(
        PathsSearchSearchGetParametersQueryResponse_types.pdf,
      );
      response_types.push(
        PathsSearchSearchGetParametersQueryResponse_types.link_to_source,
      );
    }

    if (
      !selected.source.campuslife &&
      !selected.source.eduwiki &&
      !selected.source.hotel &&
      !selected.source.moodle &&
      !selected.source.maps &&
      !selected.source.residents
    ) {
      sources.push(InfoSources.campuslife);
      sources.push(InfoSources.eduwiki);
      sources.push(InfoSources.hotel);
      sources.push(InfoSources.moodle);
      sources.push(InfoSources.maps);
      sources.push(InfoSources.residents);
    }

    Object.entries(selectedFilters).forEach(([group, values]) => {
      const selectedValues = Object.entries(values)
        .filter(([, checked]) => checked)
        .map(([value]) => value);

      if (group === "fileType") {
        selectedValues.forEach((value) => {
          if (value === "pdf")
            response_types.push(
              PathsSearchSearchGetParametersQueryResponse_types.pdf,
            );
          if (value === "link_to_source")
            response_types.push(
              PathsSearchSearchGetParametersQueryResponse_types.link_to_source,
            );
        });
      } else if (group === "source") {
        selectedValues.forEach((value) => {
          if (value === "campuslife") sources.push(InfoSources.campuslife);
          if (value === "eduwiki") sources.push(InfoSources.eduwiki);
          if (value === "hotel") sources.push(InfoSources.hotel);
          if (value === "moodle") sources.push(InfoSources.moodle);
          if (value === "maps") sources.push(InfoSources.maps);
          if (value === "residents") sources.push(InfoSources.residents);
        });
      }
    });
    return { response_types, sources, query_categories };
  };

  const filters = useMemo(
    () => buildQueryFilters(appliedFilters),
    [appliedFilters],
  );

  const applyFilters = () => {
    setAppliedFilters(selectedFilters);
  };

  const { data: searchResult } = $search.useQuery(
    "get",
    "/search/search",
    (() => {
      return {
        params: {
          query: {
            query: searchQuery,
            ...filters,
          },
        },
      };
    })(),
    {
      enabled: searchQuery.length > 0,
      // Disable refetch
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );

  const filteredResponses =
    searchResult?.responses
      .filter((e) => {
        if (filters.response_types.length === 0) {
          return true;
        }

        const url = "url" in e.source ? e.source.url : "";

        const isPdf =
          filters.response_types.includes(
            PathsSearchSearchGetParametersQueryResponse_types.pdf,
          ) && url.endsWith(".pdf");

        const isLink =
          filters.response_types.includes(
            PathsSearchSearchGetParametersQueryResponse_types.link_to_source,
          ) && !url.endsWith(".pdf");

        return isPdf || isLink;
      })
      .filter((e) => {
        if (filters.sources.length == 0) {
          return true;
        }

        const sourceType = e.source.type as string;
        return filters.sources.includes(sourceType as InfoSources);
      }) || [];

  useEffect(() => {
    const first = searchResult?.responses?.[0];
    if (
      first &&
      (first.source.type === "moodle-file" ||
        first.source.type === "moodle-url" ||
        first.source.type === "moodle-unknown" ||
        first.source.type === "telegram")
    ) {
      // Reset preview source when search result changes and it has an appropeiate type for preview
      setPreviewSource(searchResult?.responses[0]?.source);
    }
  }, [searchResult]);

  const runSearch = (query: string) => {
    navigate({ to: "/search", search: { q: query } });
  };

  if (!me) {
    return <AuthWall />;
  }

  return (
    <div className="flex grow flex-col gap-2 p-4">
      <SearchField
        runSearch={runSearch}
        currentQuery={searchQuery}
        selectedFilters={selectedFilters}
        checks={checks}
        applyFilters={applyFilters}
      />
      {searchResult && (
        <p className="py-4 text-xl font-semibold text-contrast">
          {filteredResponses.length > 0
            ? `Results for: ${searchResult.searched_for}`
            : `No matched results for: ${searchResult.searched_for}`}
        </p>
      )}
      {searchResult && (
        <div className="flex flex-row gap-6">
          <div className="flex w-full flex-col justify-stretch gap-4 md:min-w-0 md:basis-1/2">
            {filteredResponses.map((response, i) => (
              <SearchResult
                key={i}
                response={response}
                isSelected={previewSource === response.source}
                select={() => setPreviewSource(response.source)}
                hasPreview={
                  response.source.type === "moodle-file" ||
                  response.source.type === "moodle-url" ||
                  response.source.type === "moodle-unknown"
                }
              />
            ))}
          </div>
          {previewSource &&
            (previewSource.type === "moodle-file" ||
              previewSource.type === "moodle-url" ||
              previewSource.type === "moodle-unknown") && (
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
