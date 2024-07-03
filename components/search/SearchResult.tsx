import { search } from "@/lib/search";
import clsx from "clsx";
import React, { useEffect, useState } from "react";

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
  const [isClicked, setIsClicked] = useState(
    selectedSource === response.source,
  );
  const source = response.source;

  useEffect(() => {
    if (selectedSource != source) {
      setIsClicked(false);
    }
  }, [selectedSource, source]);

  function handleDivClick() {
    console.log("Clicked");
    setPreviewSource(source);
    setIsClicked(true);
  }
  return (
    <div
      onClick={() => handleDivClick()}
      className={clsx(
        "flex flex-col rounded-lg !border bg-primary-main p-4 hover:bg-primary-hover",
        isClicked
          ? "border-[#9747FF] drop-shadow-[0_0_4px_#9747FF]"
          : "border-gray-400",
      )}
    >
      {source.type === "moodle" ? (
        <span className="icon-[material-symbols--school-outline] text-3xl text-[#F27F22]" />
      ) : (
        source.type === "telegram" && (
          <span className="icon-[uil--telegram-alt] text-3xl text-[#27A7E7]" />
        )
      )}
      <p className="text-xs font-semibold text-base-content dark:text-white md:text-2xl">
        {source.display_name}
      </p>
      <p className="invisible h-0 text-xs text-breadcrumbs md:visible md:h-auto">
        {source.breadcrumbs.join(" > ")}
      </p>
    </div>
  );
}
