import { search } from "@/lib/search";
import dynamic from "next/dynamic";
import React, { useState } from "react";
import Markdown from "react-markdown";
import SearchSource from "./SearchSource";

export const PdfPreview = dynamic(
  () => import("./pdfpreview").then((x) => x.default),
  { ssr: false },
);

export default function SearchResult({
  response,
}: {
  response: search.SearchResponse;
}) {
  const [selectedSourceIndex, setSelectedSourceIndex] = useState(0);
  const selectedSource = response.sources[selectedSourceIndex];

  return (
    <div className="m-4 flex w-full flex-col gap-4 rounded-2xl bg-primary-main lg:flex-row">
      <div className="group flex grow flex-col gap-2 rounded-2xl px-4 py-6">
        <Markdown className="prose dark:prose-invert">
          {response.markdown_text}
        </Markdown>

        {response.sources.length != 0 && (
          <div className="sources">
            <p style={{ fontWeight: "bold" }}>Sources:</p>
            {response.sources.map((source, i) => {
              if (source.type === "moodle") {
                return (
                  <SearchSource
                    key={i}
                    isSelected={selectedSourceIndex === i}
                    source={source.course_name}
                    onSelect={() => setSelectedSourceIndex(i)}
                    link={source.anchor_url}
                  />
                );
              } else if (source.type === "telegram") {
                return (
                  <SearchSource
                    key={i}
                    isSelected={selectedSourceIndex === i}
                    source={source.chat_title}
                    onSelect={() => setSelectedSourceIndex(i)}
                    link={source.link}
                  />
                );
              }
              return null; // добавить для безопасного возврата null, если не удовлетворяет условиям
            })}
          </div>
        )}
      </div>

      {selectedSource.type === "moodle" &&
      selectedSource.resource_preview_url !== null ? (
        <PdfPreview
          file={selectedSource.resource_preview_url}
          fileTitle={selectedSource.display_name}
          searchText=""
        />
      ) : (
        selectedSource.type === "telegram" && (
          <div className="flex w-full flex-col items-center justify-center gap-4">
            <p>No preview available</p>
            <a
              href={selectedSource.link}
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
