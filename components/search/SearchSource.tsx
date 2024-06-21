import React, { MouseEventHandler, useCallback, useState } from "react";

export declare type SearchSourceProps = {
  isSelected: boolean;
  source: string;
  onSelect: MouseEventHandler<HTMLDivElement>;
  link: string;
};

function SearchSource({
  isSelected,
  source,
  onSelect,
  link,
}: SearchSourceProps) {
  const bgColor = isSelected
    ? "bg-primary-hover"
    : "bg-primary-main hover:bg-secondary-main";
  const searchClassName =
    "grid grid-flow-col items-center justify-between p-4 " + bgColor;
  console.log(isSelected);
  console.log(searchClassName);
  return (
    <div className={searchClassName} onClick={onSelect}>
      <p className="pr-1">{source}</p>
      <a href={link}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="size-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
          />
        </svg>
      </a>
    </div>
  );
}

export default SearchSource;
