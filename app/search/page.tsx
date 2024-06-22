"use client";
import { NavbarTemplate } from "@/components/layout/Navbar";
import SearchField from "@/components/search/searchfield";
import SearchResult from "@/components/search/SearchResult";
import { search } from "@/lib/search";
import React from "react";

export default function Page() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const { data: searchResult } = search.useSearchSearchByMeta(
    { query: searchQuery },
    {
      query: {
        enabled: searchQuery.length > 0,
      },
    },
  );

  const runSearch = (query: string) => {
    setSearchQuery(query.trim());
  };

  return (
    <div className="flex flex-col p-4 @container/content @2xl/main:p-12">
      <NavbarTemplate
        title="Search"
        description="Find anything at Innopolis University"
      />
      <div className="my-4 grid grid-cols-1 gap-4">
        <SearchField runSearch={runSearch} />
        {searchResult && (
          <div className="search-result w-full">
            <p className="search-result-title text-2xl font-semibold text-text-main">
              Results for: {searchResult.searched_for}
            </p>
            {searchResult.responses.map((response, i) => (
              <SearchResult key={i} response={response} />
            ))}
          </div>
        )}

        {searchResult && !searchResult.responses && (
          <div className="search-result w-full">
            <p className="search-result-title text-2xl font-semibold text-text-main">
              No matched results for: {searchResult.searched_for}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
