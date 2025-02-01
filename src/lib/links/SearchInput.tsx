interface SearchInputProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}
export const SearchInput: React.FC<
  SearchInputProps & React.HTMLProps<HTMLDivElement>
> = ({ searchQuery, setSearchQuery, ...props }) => {
  return (
    <div className="relative flex w-full items-center gap-2" {...props}>
      <input
        autoComplete="off"
        spellCheck={false}
        className="inset-0 h-10 w-full resize-none rounded-lg border-2 border-brand-violet bg-pagebg p-3 text-base caret-brand-violet outline-none dark:text-white"
        placeholder="Search services..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      {searchQuery.length > 0 && (
        <button
          type="button"
          onClick={() => setSearchQuery("")}
          className="absolute right-2 top-1/2 flex -translate-y-1/2 transform items-center"
        >
          <span className="icon-[material-symbols--close] text-xl text-brand-violet" />
        </button>
      )}
    </div>
  );
};
