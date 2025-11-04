import { useEffect, useRef, useState } from "react";

interface SearchInputProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}
export const SearchInput: React.FC<
  SearchInputProps & React.HTMLProps<HTMLDivElement>
> = ({ searchQuery, setSearchQuery, ...props }) => {
  const ref = useRef<HTMLInputElement>(null);
  const [readOnly, setReadOnly] = useState(true);

  useEffect(() => {
    if (ref.current) {
      // Autofocus the input field, without scrolling the page
      ref.current.focus({ preventScroll: true });
      setReadOnly(false);
    }
  }, []);

  return (
    <div className="relative flex w-full items-center gap-2" {...props}>
      <input
        ref={ref}
        autoComplete="off"
        spellCheck={false}
        readOnly={readOnly} // Will be reset to false after mounting
        className="border-primary bg-base-100 caret-primary rounded-field inset-0 h-10 w-full resize-none border p-3 text-base outline-hidden dark:text-white"
        placeholder="Search services..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      {searchQuery.length > 0 && (
        <button
          type="button"
          onClick={() => setSearchQuery("")}
          className="absolute top-1/2 right-2 flex -translate-y-1/2 transform items-center"
        >
          <span className="icon-[material-symbols--close] text-primary text-xl" />
        </button>
      )}
    </div>
  );
};
