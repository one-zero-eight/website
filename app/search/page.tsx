"use client";
import { PdfPreviewProps } from "@/components/search/pdfpreview";
import SearchField from "@/components/search/searchfield";
import SearchResult from "@/components/search/SearchResult";
import { ResponseData } from "@/hooks/sendSearchRequest";
import { useState } from "react";

const styles = {
  searchPage: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "20px",
  },
};

export default function Page() {
  const [searchResult, setSearchResult] = useState<ResponseData | null>(null);

  return (
    <div className="search-page" style={styles.searchPage}>
      <div className="my-4 grid grid-cols-1 gap-4 @xl/content:grid-cols-2">
        <SearchField
          searchResult={searchResult}
          setSearchResult={setSearchResult}
        />
        {searchResult && searchResult.responses && (
          <div className="search-result">
            <p className="search-result-title text-2xl font-semibold text-text-main">
              Results for: {searchResult.search_text}
            </p>
            <SearchResult response_data={searchResult} />
          </div>
        )}

        {searchResult && !searchResult.responses && (
          <div className="search-result">
            <p className="search-result-title text-2xl font-semibold text-text-main">
              No matched results for: {searchResult.search_text}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
