import { search } from "@/lib/search";
import dynamic from "next/dynamic";
import React, { useState } from "react";
import SearchResult from "./SearchResult";
import { SearchResponseSource } from "@/lib/search/api/__generated__";
import PdfPreview from "./pdfpreview";

export default function SearchResultPage({
  searchResult,
}: {
  searchResult: search.SearchResponses;
}) {
  const [previewSource, setPreviewSource] =
    useState<SearchResponseSource | null>(searchResult.responses[0]?.source);

  return (
    <div className="flex w-[100%] flex-row">
      <div className="flex w-[50%] flex-col">
        {searchResult.responses.map((response, i) => (
          <SearchResult
            key={i}
            response={response}
            selectedSource={previewSource}
            setPreviewSource={setPreviewSource}
          />
        ))}
      </div>

      {previewSource &&
      previewSource.type === "moodle" &&
      previewSource.resource_preview_url !== null ? (
        <PdfPreview
          file={previewSource.resource_preview_url}
          fileTitle={previewSource.display_name}
          searchText=""
        />
      ) : (
        previewSource &&
        previewSource.type === "telegram" && (
          <div className="flex h-[849px] w-[50%] w-full flex-col items-center justify-center gap-4">
            <p>No preview available</p>
            <a
              href={previewSource.link}
              className="bg-primary-hover/75 p-4 hover:bg-primary-hover"
            >
              Go to the source
            </a>
          </div>
        )
      )}
    </div>
  );
}
