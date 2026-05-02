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
          "md:bg-base-200 rounded-field text-base-content hover:bg-base-300 md:border-base-content/50 flex items-center gap-2 bg-transparent px-2 text-sm font-medium md:h-10 md:border! md:py-2" +
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
