"use client";
import { NavbarTemplate } from "@/components/layout/Navbar";
import SearchField from "@/components/search/searchfield";
import SearchResult from "@/components/search/SearchResult";
import SearchResultPage from "@/components/search/searchResultPage";
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
      <div className="flex flex-col gap-4">
        <div className="flex flex-row gap-12">
          <SearchField runSearch={runSearch} />
        </div>
        {searchResult &&
          (searchResult.responses.length > 0 ? (
            <div className="flex w-full flex-col items-center">
              <p className="p-4 text-2xl font-semibold text-text-main">
                Results for: {searchResult.searched_for}
              </p>
              <SearchResultPage searchResult={searchResult}></SearchResultPage>
            </div>
          ) : (
            <div className="flex w-full flex-col items-center">
              <p className="p-4 text-2xl font-semibold text-text-main">
                No matched results for: {searchResult.searched_for}
              </p>
            </div>
          ))}
      </div>
    </div>
  );
}
