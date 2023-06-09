import SearchIcon from "./icons/SearchIcon";

function Search({
  value,
  setSearch,
}: {
  value: string;
  setSearch: (v: string) => void;
}) {
  return (
    <div className="flex flex-row justify-start items-center">
      <SearchIcon className="w-10" />
      <input
        type="text"
        className="form-control rounded-2xl bg-background_dark font-semibold text-lg sm:text-xl px-2 py-2 sm:py-3 sm:ml-4 w-5/6 border-2"
        placeholder="Search"
        value={value}
        onChange={(e) => setSearch(e.target.value)}
      ></input>
    </div>
  );
}

export default Search;
