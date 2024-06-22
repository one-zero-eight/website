import React, { useState } from "react";
import "./search.css";

export default function SearchField({
  runSearch,
}: {
  runSearch: (query: string) => void;
}) {
  const [text, setText] = useState("");

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      runSearch(text);
    }
  };

  return (
    <div className="search-field">
      <label
        htmlFor="searchInput"
        className="mb-4 text-center text-3xl font-medium"
      >
        Find anything
      </label>
      <input
        autoComplete="off"
        spellCheck={false}
        className="search-textarea hide-scrollbar inset-0 w-full resize-none rounded-2xl border-2 border-focus bg-base p-3 caret-focus outline-none"
        maxLength={200}
        onKeyDown={handleKeyDown}
        onChange={(e) => setText(e.target.value)}
        value={text}
      />
    </div>
  );
}
