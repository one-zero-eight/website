import { useState, useEffect } from "react";
import ToggleGroup from "./ToggleGroup";
import { useRouter, useLocation } from "@tanstack/react-router";

export default function SearchField({
  runSearch,
  currentQuery,
}: {
  runSearch: (query: string) => void;
  currentQuery: string;
}) {
  const [text, setText] = useState(currentQuery);
  const router = useRouter();
  const location = useLocation();

  useEffect(() => {
    setText(currentQuery);
  }, [currentQuery]);

  return (
    <form
      className="flex"
      onSubmit={(e) => {
        e.preventDefault();
        const currentPath = location.pathname;
        const query = text.trim();

        router.navigate({
          to: currentPath,
          search: (prev) => ({ ...prev, query }),
        });
        runSearch(text);
      }}
    >
      <div className="flex w-full gap-6">
        <div className="justify-stretch md:min-w-0 md:basis-1/2">
          <input
            autoComplete="off"
            spellCheck={false}
            className="inset-0 h-10 w-full resize-none rounded-lg border-2 border-brand-violet bg-pagebg pl-3 text-base caret-brand-violet outline-none dark:text-white"
            placeholder="Enter query..."
            onChange={(e) => setText(e.target.value)}
            value={text}
            autoFocus={true}
          />
        </div>
        <div className="justify-stretch md:min-w-0 md:basis-1/2">
          <ToggleGroup currentTabText={text} />
        </div>
      </div>
    </form>
  );
}
