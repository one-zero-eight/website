import { useState } from "react";
import "./search.css";

export default function SearchField({
  runSearch,
  currentQuery,
}: {
  runSearch: (query: string) => void;
  currentQuery: string;
}) {
  const [text, setText] = useState(currentQuery);
  return (
    <form
      className="flex"
      onSubmit={(e) => {
        e.preventDefault();
        runSearch(text);
      }}
    >
      <div className="flex flex-row gap-2 md:basis-1/2">
        <input
          autoComplete="off"
          spellCheck={false}
          className="inset-0 h-10 w-full resize-none rounded-lg border-2 border-focus bg-base p-3 text-base text-base-content caret-focus outline-none dark:text-white"
          placeholder="Search anything"
          onChange={(e) => setText(e.target.value)}
          value={text}
          autoFocus={true}
        />
        <button
          type="submit"
          className="btn-primary mr-3 flex h-10 w-[93px] items-center justify-center gap-2 rounded-lg bg-[#9747FF] px-2 py-1 text-base font-normal leading-6 text-white shadow-[0px-0px-4px-#00000040] hover:bg-[#6600CC]"
        >
          <span className="icon-[material-symbols--search-rounded] h-4 w-4" />
          Search
        </button>
      </div>
    </form>
  );
}
