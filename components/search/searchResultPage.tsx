import { search } from "@/lib/search";
import { SearchResponseSource } from "@/lib/search/api/__generated__";
import dynamic from "next/dynamic";
import React, { useState } from "react";
import SearchResult from "./SearchResult";

export const PdfPreview = dynamic(
  () => import("./pdfpreview").then((x) => x.default),
  { ssr: false },
);

export default function SearchResultPage({
  searchResult,
}: {
  searchResult: search.SearchResponses;
}) {
  const [previewSource, setPreviewSource] =
    useState<SearchResponseSource | null>(searchResult.responses[0]?.source);

  return (
    <div className="grid w-full grow grid-cols-1 gap-6 md:grid-cols-2">
      <div className="flex flex-row justify-stretch gap-4 md:flex-col">
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
        <PdfPreview source={previewSource} searchText="" />
      ) : (
        previewSource &&
        previewSource.type === "telegram" && (
          <div className="flex h-[849px] basis-1/2 flex-col items-center justify-center gap-4">
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
