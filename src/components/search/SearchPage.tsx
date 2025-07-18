import { useMe } from "@/api/accounts/user.ts";
import { $search, searchTypes } from "@/api/search";
import { AuthWall } from "@/components/common/AuthWall.tsx";
import PreviewCard from "@/components/search/PreviewCard.tsx";
import SearchField from "@/components/search/SearchField.tsx";
import SearchResult from "@/components/search/SearchResult.tsx";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  InfoSources,
  PathsSearchSearchGetParametersQueryResponse_types,
  Resources,
} from "@/api/search/types";
import IframePreviewCard from "./IframePreviewCard";

export function SearchPage({ searchQuery }: { searchQuery: string }) {
  const navigate = useNavigate();
  const { me } = useMe();

  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);
  const didInit = useRef<boolean>(false);

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
      myuni: true,
      innohassle: true,
      ithelp: true,
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
    const sources: (InfoSources | Resources)[] = [];
    const query_categories: string[] = [];

    if (!selected.fileType.pdf && !selected.fileType.link_to_source) {
      response_types.push(
        PathsSearchSearchGetParametersQueryResponse_types.pdf,
      );
      response_types.push(
        PathsSearchSearchGetParametersQueryResponse_types.link_to_source,
      );
    }

    const allSourcesSelected =
      selected.source.campuslife &&
      selected.source.eduwiki &&
      selected.source.hotel &&
      selected.source.moodle &&
      selected.source.maps &&
      selected.source.residents &&
      selected.source.myuni &&
      selected.source.innohassle &&
      selected.source.ithelp;

    if (!allSourcesSelected) {
      if (selected.source.campuslife) sources.push(InfoSources.campuslife);
      if (selected.source.eduwiki) sources.push(InfoSources.eduwiki);
      if (selected.source.hotel) sources.push(InfoSources.hotel);
      if (selected.source.moodle) sources.push(InfoSources.moodle);
      if (selected.source.maps) sources.push(InfoSources.maps);
      if (selected.source.residents) sources.push(InfoSources.residents);
      if (selected.source.innohassle) sources.push(Resources.innohassle);
      if (selected.source.myuni) sources.push(Resources.myuni);
      if (selected.source.ithelp) sources.push(Resources.ithelp);
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
          if (value === "innohassle") sources.push(Resources.innohassle);
          if (value === "myuni") sources.push(Resources.myuni);
          if (value === "ithelp") sources.push(Resources.ithelp);
        });
      }
    });
    return { response_types, sources, query_categories };
  };

  const isMobile =
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 767px)").matches;

  const filters = useMemo(
    () => buildQueryFilters(appliedFilters),
    [appliedFilters],
  );

  const applyFilters = () => {
    setAppliedFilters(selectedFilters);
  };

  const { data: searchResult, isLoading } = $search.useQuery(
    "get",
    "/search/search",
    {
      params: {
        query: {
          query: submittedQuery || "",
          response_types: filters.response_types,
          ...(filters.response_types.length > 0 && {
            response_types: filters.response_types,
          }),
        },
      },
    },
    {
      enabled: Boolean(submittedQuery?.length),
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
          return false;
        }

        const sourceType = e.source.type as string;
        if (e.source.type === "resources") {
          const resourceType = e.source.resource_type as string;
          return filters.sources.includes(resourceType as InfoSources);
        }
        return filters.sources.includes(sourceType as InfoSources);
      }) || [];

  useEffect(() => {
    const first = filteredResponses[0];
    if (first && previewSource === undefined && !isMobile) {
      // Reset preview source when search result changes and it has an appropeiate type for preview
      setPreviewSource(first.source);
    }
  }, [searchResult]);

  useEffect(() => {
    //Reset preview if no sources in filtered
    if (filteredResponses.length === 0 && previewSource) {
      setPreviewSource(undefined);
    }
  }, [filteredResponses]);

  useEffect(() => {
    if (didInit.current) {
      setSubmittedQuery(searchQuery);
    } else {
      didInit.current = true;
    }
  }, [searchQuery]);

  const runSearch = (query: string) => {
    navigate({ to: "/search", search: { q: query } });
    setSubmittedQuery(query);
  };

  if (!me) {
    return <AuthWall />;
  }

  return (
    <div className="flex grow flex-col gap-2 p-4">
      <SearchField
        pageType="search"
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
      {isLoading && (
        <>
          <p className="py-4 text-xl font-semibold text-contrast">
            Loading search results...
          </p>
          <div className="skeleton flex flex-col gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 w-full rounded-lg"></div>
            ))}
          </div>
        </>
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
                isMobile={isMobile}
              />
            ))}
          </div>
          {previewSource &&
          !isMobile &&
          (previewSource.type === "moodle-file" ||
            previewSource.type === "moodle-url" ||
            previewSource.type === "moodle-unknown" ||
            previewSource.type === "telegram") ? (
            <PreviewCard
              source={previewSource}
              onClose={() => setPreviewSource(undefined)}
            />
          ) : (
            previewSource &&
            !isMobile &&
            "url" in previewSource && (
              <IframePreviewCard
                source={previewSource}
                onClose={() => setPreviewSource(undefined)}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}
