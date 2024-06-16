import React, { Dispatch, SetStateAction, useState } from "react";
import "./search.css";
import {
  findPdfFile,
  requestData,
  responseData,
} from "@/hooks/sendSearchRequest";

const SearchField: React.FC<{
  searchResult: responseData | null;
  setSearchResult: Dispatch<SetStateAction<responseData | null>>;
}> = ({ searchResult, setSearchResult }) => {
  const [searchQuery, setSearchQuery] = useState("");

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      sendRequest();
    }
  };

  const sendRequest = async () => {
    const data: requestData = {
      searchText: searchQuery,
    };
    const result = await findPdfFile(data);
    setSearchResult(result);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
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
        onChange={handleChange}
        value={searchQuery}
      />
    </div>
  );
};

export default SearchField;
