import { useState, useEffect } from "react";
import { SearchExample } from "./SearchExample";
import SelectSourcesFilter from "./SelectSourcesFilter";
import { DefaultButton } from "./DefaultButton";
import SearchIcon from "./icons/Search";
import AskIcon from "./icons/Ask";
import ActIcon from "./icons/Act";

const searchQueryExamples = [
  "Innopolis clubs",
  "Innopolis University",
  "Innopolis University courses",
  "Innopolis University professors",
  "Innopolis University events",
];

type PageType = "search" | "ask" | "act";
type Option = PageType[number];

const contentMap: Record<PageType, string> = {
  search: "Search",
  ask: "Ask",
  act: "Act",
};

const iconsMap: Record<Option, JSX.Element> = {
  search: <SearchIcon />,
  ask: <AskIcon />,
  act: <ActIcon />,
};

export default function SearchField({
  runSearch,
  currentQuery,
  selectedFilters,
  checks,
  applyFilters,
  pageType,
}: {
  runSearch: (query: string) => void;
  currentQuery: string;
  selectedFilters?: Record<string, Record<string, boolean>>;
  checks?: (group: string, value: string) => void;
  applyFilters?: () => void;
  pageType: PageType;
}) {
  const [text, setText] = useState(currentQuery);

  useEffect(() => {
    setText(currentQuery);
  }, [currentQuery]);

  return (
    <div className="flex w-full gap-4">
      <form
        name="search"
        className="flex w-full flex-col justify-stretch gap-2 md:min-w-0 md:basis-1/2"
        onSubmit={(e) => {
          e.preventDefault();
          runSearch(text);
        }}
      >
        <div className="flex flex-col gap-2">
          <input
            autoComplete="off"
            spellCheck={false}
            className="inset-0 h-10 resize-none rounded-lg border-2 border-brand-violet bg-pagebg pl-3 text-base caret-brand-violet outline-none dark:text-white"
            placeholder="Enter query..."
            onChange={(e) => setText(e.target.value)}
            value={text}
            autoFocus={true}
          />
          <div className="hidden md:inline">
            <SearchExample searchQueries={searchQueryExamples} />
          </div>
          {selectedFilters && checks && applyFilters && (
            <div className="inline md:hidden">
              <SelectSourcesFilter
                selected={selectedFilters}
                checks={checks}
                applyFilters={applyFilters}
              />
            </div>
          )}
        </div>
      </form>
      <div className="flex justify-between gap-4 md:min-w-0 md:basis-1/2">
        <DefaultButton
          content={contentMap[pageType]}
          onClick={() => runSearch(text)}
          icon={iconsMap[pageType]}
          border
        />
        {selectedFilters && checks && applyFilters && (
          <div className="hidden md:inline">
            <SelectSourcesFilter
              selected={selectedFilters}
              checks={checks}
              applyFilters={applyFilters}
            />
          </div>
        )}
      </div>
    </div>
  );
}
