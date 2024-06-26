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
    <div className="flex gap-2">
      <input
        autoComplete="off"
        spellCheck={false}
        className="inset-0 h-fit w-full resize-none rounded-2xl border-2 border-focus bg-base p-3 caret-focus outline-none"
        placeholder={"Search anything"}
        onKeyDown={handleKeyDown}
        onChange={(e) => setText(e.target.value)}
        value={text}
      />
    </div>
  );
}
