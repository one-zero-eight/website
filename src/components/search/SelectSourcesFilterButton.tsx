import { forwardRef } from "react";
import SearchFiltersIcon from "./icons/SearchFilters";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  open?: boolean;
};

const SelectSourcesFilterButton = forwardRef<HTMLButtonElement, Props>(
  ({ open, className, ...props }, ref) => (
    <>
      <button
        ref={ref}
        {...props}
        type="button"
        className={
          "flex items-center gap-2 rounded-lg bg-transparent px-2 text-sm font-medium text-black hover:bg-[#e6e6e6] dark:text-white dark:hover:bg-[#1e1e1e] md:h-10 md:!border md:border-gray-400 md:bg-floating md:py-2" +
          (className ? " " + className : "")
        }
      >
        Sources
        <span
          className={`align-center flex h-5 w-5 justify-center ${
            open ? "rotate-180" : ""
          }`}
        >
          <SearchFiltersIcon className="block" />
        </span>
      </button>
    </>
  ),
);

export default SelectSourcesFilterButton;
