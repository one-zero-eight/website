import { search } from "@/lib/search";
import dynamic from "next/dynamic";
import React, { useState } from "react";
import Markdown from "react-markdown";
import SearchSource from "./SearchSource";
import {
  MoodleSource,
  MoodleSourceType,
  TelegramSource,
} from "@/lib/search/api/__generated__";

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
  const source = response.source;

  return (
    <div className="m-4 flex w-full flex-col gap-4 rounded-2xl bg-primary-main lg:flex-row">
      <div className="group flex grow flex-col gap-2 rounded-2xl px-4 py-6">
        <div>
          {source.type === "moodle"
            ? (source as MoodleSource).filename
            : source.type === "telegram"
              ? (source as TelegramSource).display_name
              : ""}
        </div>
      </div>

      {source.type === "moodle" && source.resource_preview_url !== null ? (
        <PdfPreview
          file={source.resource_preview_url}
          fileTitle={source.display_name}
          searchText=""
        />
      ) : (
        source.type === "telegram" && (
          <div className="flex w-full flex-col items-center justify-center gap-4">
            <p>No preview available</p>
            <a
              href={source.link}
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
