import React, { useState } from "react";
import "./search.css";

export default function SearchField({
  runSearch,
}: {
  runSearch: (query: string) => void;
}) {
  const [text, setText] = useState("");
  const [clickedButton, setClickedButton] = useState<string>("Search");

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      runSearch(text);
    }
  };

  const handleButtonClick = (buttonType: string) => {
    setClickedButton(buttonType);
    if (buttonType === "Search") {
      setClickedButton("Search");
    } else if (buttonType === "Ask") {
      setClickedButton("Ask");
    }
  };

  return (
    <div className="mt-4 flex gap-2">
      <input
        autoComplete="off"
        spellCheck={false}
        className="inset-0 h-fit w-full resize-none rounded-2xl border-2 border-focus bg-base p-3 caret-focus outline-none"
        placeholder={"Search anything"}
        onKeyDown={handleKeyDown}
        onChange={(e) => setText(e.target.value)}
        value={text}
      />
      <button
        className={`btn btn-square btn-xs h-auto w-[110px] rounded-2xl text-base ${
          clickedButton === "Search"
            ? "btn-primary bg-[#9747FF] hover:bg-[#6600CC]"
            : "btn-ghost text-black"
        }`}
        onClick={() => handleButtonClick("Search")}
      >
        Search
      </button>
      <button
        className={`btn btn-square btn-xs h-auto w-[110px] rounded-2xl text-base ${
          clickedButton === "Ask"
            ? "btn-primary bg-[#9747FF] hover:bg-[#6600CC]"
            : "btn-ghost text-black"
        }`}
        onClick={() => handleButtonClick("Ask")}
      >
        Ask
      </button>
    </div>
  );
}
