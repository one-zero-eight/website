interface SearchInputProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}
export const SearchInput: React.FC<SearchInputProps> = ({
  searchQuery,
  setSearchQuery,
}) => {
  return (
    <div className="relative flex w-full items-center gap-2">
      <input
        autoComplete="off"
        spellCheck={false}
        className="inset-0 h-10 w-full resize-none rounded-lg border-2 border-brand-violet bg-pagebg p-3 text-base caret-brand-violet outline-none dark:text-white"
        placeholder="Search anything"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        autoFocus={true}
      />
      {searchQuery.length > 0 && (
        <span
          className="icon-[material-symbols--close] absolute right-2 top-3 text-brand-violet"
          onClick={() => setSearchQuery("")}
        />
      )}
    </div>
  );
};
