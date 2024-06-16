"use client";
import SearchResult from "@/components/search/SearchResult";
import SearchField from "@/components/search/searchfield";
import { PdfPreviewProps } from "@/components/search/pdfpreview";
import { useState } from "react";
import { responseData } from "@/hooks/sendSearchRequest";

const styles = {
  searchPage: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "20px",
  },
};

const preview_props: PdfPreviewProps = {
  file: "https://ontheline.trincoll.edu/images/bookdown/sample-local-pdf.pdf",
  searchText: "PDF",
};

export default function Page() {
  const [searchResult, setSearchResult] = useState<responseData | null>(null);

  return (
    <div className="search-page" style={styles.searchPage}>
      <div className="my-4 grid grid-cols-1 gap-4 @xl/content:grid-cols-2">
        <SearchField
          searchResult={searchResult}
          setSearchResult={setSearchResult}
        />
        {searchResult && searchResult.file && (
          <div className="search-result">
            <p className="search-result-title text-2xl font-semibold text-text-main">
              Results for: {searchResult.searchText}
            </p>
            <SearchResult
              file={searchResult.file}
              searchText={searchResult.searchText}
            />{" "}
          </div>
        )}

        {searchResult && !searchResult.file && (
          <div className="search-result">
            <p className="search-result-title text-2xl font-semibold text-text-main">
              No matched results for: {searchResult.searchText}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
