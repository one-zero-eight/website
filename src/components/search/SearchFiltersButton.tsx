import { forwardRef } from "react";
import SearchFiltersIcon from "./icons/SearchFilters";

const SearchFiltersButton = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>((props, ref) => (
  <div>
    <button
      ref={ref}
      {...props}
      className={
        "flex items-center gap-1 text-sm text-gray-600 hover:text-gray-400 " +
        "dark:text-[#8A8A8A] dark:hover:text-[#B5B5B5]" +
        props.className
      }
    >
      <span className="h-5 w-5">
        <SearchFiltersIcon />
      </span>
      Search filters
    </button>
  </div>
));

export default SearchFiltersButton;
