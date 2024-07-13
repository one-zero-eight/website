"use client";
import { NavbarTemplate } from "@/components/layout/Navbar";
import PreviewCard from "@/components/search/PreviewCard";
import SearchField from "@/components/search/SearchField";
import SearchResult from "@/components/search/SearchResult";
import { search } from "@/lib/search";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q") ?? "";

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
    // Update query parameter in URL
    const url = new URL(window.location.href);
    url.searchParams.set("q", query.trim());
    router.push(url.toString());
  };

  return (
    <div className="flex min-h-[100dvh] flex-col p-4 @container/content @2xl/main:p-12">
      <NavbarTemplate
        title="Search"
        description="Find anything at Innopolis University"
      />
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
    </div>
  );
}
