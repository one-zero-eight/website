import { search } from "@/lib/search";
import { MoodleSource } from "@/lib/search/api/__generated__";
import clsx from "clsx";
import React, { MouseEventHandler } from "react";

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
  const isSelected = selectedSource === response.source;

  function handleDivClick() {
    console.log("Clicked");
    setPreviewSource(response.source);
  }

  const handlePropagation = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.stopPropagation();
  };

  return (
    <div
      onClick={() => handleDivClick()}
      className={clsx(
        "flex cursor-pointer flex-col rounded-lg !border bg-sidebar p-4 hover:bg-primary-hover",
        isSelected
          ? "border-[#9747FF] drop-shadow-[0_0_4px_#9747FF]"
          : "border-gray-400",
      )}
    >
      {response.source.type === "moodle" ? (
        <span className="icon-[material-symbols--school-outline] text-3xl text-[#F27F22]" />
      ) : (
        response.source.type === "telegram" && (
          <span className="icon-[uil--telegram-alt] text-3xl text-[#27A7E7]" />
        )
      )}
      <p className="text-xs font-semibold text-base-content dark:text-white md:text-2xl">
        {response.source.display_name}
      </p>

      <a
        href={(response.source as MoodleSource).link}
        onClickCapture={handlePropagation}
      >
        <p className="invisible h-0 truncate text-xs text-breadcrumbs hover:underline md:visible md:h-auto">
          {response.source.breadcrumbs.join(" > ")}
        </p>
      </a>
    </div>
  );
}
