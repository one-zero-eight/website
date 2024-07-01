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
    <div className="mt-4 flex flex-row gap-2 md:basis-1/2">
      <input
        autoComplete="off"
        spellCheck={false}
        className="inset-0 h-10 w-full resize-none rounded-lg border-2 border-focus bg-base p-3 text-base text-base-content caret-focus outline-none dark:text-white"
        placeholder={"Search anything"}
        onKeyDown={handleKeyDown}
        onChange={(e) => setText(e.target.value)}
        value={text}
      />
      <button
        className={`shadow-[0px-0px-4px-#00000040]; flex h-10 items-center justify-center rounded-lg px-3 text-xs font-normal text-white shadow-search-btn ${
          clickedButton === "Search"
            ? "btn-primary bg-[#9747FF] hover:bg-[#6600CC]"
            : "btn-ghost text-black"
        }`}
        onClick={() => handleButtonClick("Search")}
      >
        <span
          className="icon-[material-symbols--search-rounded]"
          style={{ width: "1.3rem", height: "1.3rem" }}
        ></span>
        Search
      </button>
      <button
        className={`flex h-10 flex-row items-center justify-center gap-2 rounded-lg px-3 text-xs font-normal text-base-content shadow-search-btn shadow-[0px-0px-4px-#00000040] dark:text-white ${
          clickedButton === "Ask"
            ? "btn-primary bg-[#9747FF] hover:bg-[#6600CC]"
            : "bg-primary-main"
        }`}
        // onClick={() => handleButtonClick("Ask")}
      >
        <span className="icon-[material-symbols--question-mark-rounded]"></span>
        <p>Ask</p>
      </button>
    </div>
  );
}
