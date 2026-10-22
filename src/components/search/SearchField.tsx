import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { useEffect, useState } from "react";
import { SearchExample } from "./SearchExample";
import SelectSourcesFilter from "./SelectSourcesFilter";
import SearchIcon from "./icons/Search";
import AskIcon from "./icons/Ask";
import ActIcon from "./icons/Act";
import { PageActionButton } from "./PageActionButton";

const searchQueryExampleMessages = [
  msg`Innopolis clubs`,
  msg`Innopolis University`,
  msg`Innopolis University courses`,
  msg`Innopolis University professors`,
  msg`Innopolis University events`,
] as const;

type PageType = "search" | "ask" | "act";
type Option = PageType[number];

const iconsMap: Record<Option, React.JSX.Element> = {
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
  setCurrentQuery,
}: {
  runSearch: (query: string) => void;
  currentQuery: string;
  selectedFilters?: Record<string, Record<string, boolean>>;
  checks?: (group: string, value: string) => void;
  applyFilters?: () => void;
  pageType: PageType;
  setCurrentQuery?: (value: string) => void;
}) {
  const { i18n, t } = useLingui();
  const [text, setText] = useState(currentQuery);

  const searchQueryExamples = searchQueryExampleMessages.map((message) =>
    i18n._(message),
  );
  const pageActionLabel =
    pageType === "ask" ? t`Ask` : pageType === "act" ? t`Act` : t`Search`;

  useEffect(() => {
    setText(currentQuery);
  }, [currentQuery]);

  const handleSearch = () => {
    runSearch(text);
    if (setCurrentQuery && pageType === "ask") {
      setCurrentQuery("");
      setText("");
    }
  };

  return (
    <div className="flex w-full sm:gap-4">
      <form
        name="search"
        className="flex w-full flex-col justify-stretch gap-2 md:min-w-0 md:basis-1/2"
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch();
        }}
      >
        <div className="flex flex-col gap-4 md:gap-2">
          <input
            autoComplete="off"
            spellCheck={false}
            className="border-primary bg-base-100 caret-primary sm:rounded-field inset-0 h-10 resize-none rounded-l-lg border-2 border-r-0 pl-3 text-base outline-hidden sm:border-r-2 dark:text-white"
            placeholder={t`Enter query...`}
            onChange={(e) => setText(e.target.value)}
            value={text}
            autoFocus={true}
          />
          {pageType === "search" && (
            <div className="hidden md:inline">
              <SearchExample searchQueries={searchQueryExamples} />
            </div>
          )}
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
        <PageActionButton
          content={pageActionLabel}
          onClick={handleSearch}
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
