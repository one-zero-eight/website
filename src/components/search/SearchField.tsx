import { useState, useEffect } from "react";
import ToggleGroup from "./ToggleGroup";
import { SearchExample } from "./SearchExample";
import SearchFilters from "./SearchFilters";

const searchQueryExamples = [
  "Innopolis clubs",
  "Innopolis University",
  "Innopolis University courses",
  "Innopolis University professors",
  "Innopolis University events",
];

export default function SearchField({
  runSearch,
  currentQuery,
  selectedFilters,
  checks,
  applyFilters,
}: {
  runSearch: (query: string) => void;
  currentQuery: string;
  selectedFilters?: Record<string, Record<string, boolean>>;
  checks?: (group: string, value: string) => void;
  applyFilters?: () => void;
}) {
  const [text, setText] = useState(currentQuery);

  useEffect(() => {
    setText(currentQuery);
  }, [currentQuery]);

  return (
    <div className="flex w-full gap-6">
      <form
        className="flex flex-col justify-stretch gap-2 md:min-w-0 md:basis-1/2"
        onSubmit={(e) => {
          e.preventDefault();
          runSearch(text);
        }}
      >
        <div className="flex flex-col gap-2">
          <input
            autoComplete="off"
            spellCheck={false}
            className="inset-0 h-10 w-full resize-none rounded-lg border-2 border-brand-violet bg-pagebg pl-3 text-base caret-brand-violet outline-none dark:text-white"
            placeholder="Enter query..."
            onChange={(e) => setText(e.target.value)}
            value={text}
            autoFocus={true}
          />
          <SearchExample searchQueries={searchQueryExamples} />
        </div>
      </form>
      <div className="flex flex-col justify-stretch gap-2 md:min-w-0 md:basis-1/2">
        <ToggleGroup currentTabText={text} />
        {selectedFilters && checks && applyFilters && (
          <SearchFilters
            selected={selectedFilters}
            checks={checks}
            applyFilters={applyFilters}
          />
        )}
      </div>
    </div>
  );
}
