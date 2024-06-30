import { search } from "@/lib/search";
import dynamic from "next/dynamic";
import React, { useEffect, useState } from "react";
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
  selectedSource,
  setPreviewSource,
}: {
  response: search.SearchResponse;
  selectedSource: search.SearchResponseSource | null;
  setPreviewSource: React.Dispatch<
    React.SetStateAction<search.SearchResponseSource | null>
  >;
}) {
  const [selectedSourceIndex, setSelectedSourceIndex] = useState(0);
  const [isClicked, setIsClicked] = useState(false);
  const source = response.source;

  useEffect(() => {
    if (selectedSource != source) {
      setIsClicked(false);
    }
  }, [selectedSource]);

  function handleDivClick() {
    console.log("Clicked");
    setPreviewSource(source);
    setIsClicked(true);
  }

  return (
    <div
      onClick={() => handleDivClick()}
      className={`m-4 flex h-[150px] w-full flex-col gap-4 rounded-2xl border border-default lg:flex-row ${isClicked ? "border-2 border-focus" : ""} ${source.type === "moodle" ? "bg-primary-mdlresult" : "bg-primary-tgresult"}`}
    >
      <div className="group flex grow flex-col gap-2 rounded-2xl px-4 py-6">
        <div>
          {source.type === "moodle" ? (
            <>
              <p className="text-[30px]">
                {(source as MoodleSource).display_name}
              </p>
              <p className="text-[18px] text-breadcrumbs">
                {(source as MoodleSource).breadcrumbs.join(" > ")}
              </p>
            </>
          ) : source.type === "telegram" ? (
            <>
              <p className="text-[30px]">
                {(source as TelegramSource).display_name}
              </p>
              <p className="text-[18px] text-breadcrumbs">
                {(source as TelegramSource).breadcrumbs.join(" > ")}
              </p>
            </>
          ) : (
            ""
          )}
        </div>
      </div>
    </div>
  );
}
