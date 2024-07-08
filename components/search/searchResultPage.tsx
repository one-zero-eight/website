import { search } from "@/lib/search";
import { SearchResponseSource } from "@/lib/search/api/__generated__";
import dynamic from "next/dynamic";
import React, { useState } from "react";
import SearchResult from "./SearchResult";
import clsx from "clsx";

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

  const [isPreviewOpened, setPreviewOpened] = useState(true);

  function onSearchResultClick(source: SearchResponseSource) {
    setPreviewSource(source);
    setPreviewOpened(true);
  }

  function onClosePreview() {
    setPreviewSource(null);
    setPreviewOpened(false);
  }

  return (
    <div className="flex flex-row gap-6">
      <div
        className={clsx(
          "fixed inset-0 flex transition-colors md:hidden",
          isPreviewOpened
            ? "visible z-[2] block bg-black/50"
            : "z-[-1] bg-black/0",
        )}
        onClick={() => {
          setPreviewOpened(false);
          setPreviewSource(null);
        }}
      />
      <div className="flex w-full flex-col justify-stretch gap-4 md:min-w-0 md:basis-1/2">
        {searchResult.responses.map((response, i) => (
          <SearchResult
            key={i}
            response={response}
            selectedSource={previewSource}
            setPreviewSource={onSearchResultClick}
          />
        ))}
      </div>

      {previewSource &&
      previewSource.type === "moodle" &&
      previewSource.resource_preview_url !== null ? (
        <PdfPreview
          source={previewSource}
          searchText=""
          isOpened={isPreviewOpened}
          onClose={onClosePreview}
        />
      ) : (
        previewSource &&
        previewSource.type === "telegram" && (
          <div className="invisible flex h-[849px] basis-1/2 flex-col items-center justify-center gap-4 md:visible">
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
