import { useRouter } from "@tanstack/react-router";
import React from "react";
import clsx from "clsx";
import SearchIcon from "./icons/Search";
import AskIcon from "./icons/Ask";
import ActIcon from "./icons/Act";

const options = ["Search", "Ask", "Act"] as const;
type Option = (typeof options)[number];

const iconsMap: Record<Option, JSX.Element> = {
  Search: <SearchIcon />,
  Ask: <AskIcon />,
  Act: <ActIcon />,
};

const ToggleGroup = ({ currentTabText }: { currentTabText: string }) => {
  const router = useRouter();
  const pathname = router.state.location.pathname;

  const active =
    options.find((opt) => pathname.includes(opt.toLowerCase())) || "Search";

  const handleClick = (option: Option) => {
    const path = `/${option.toLowerCase()}`;
    router.navigate({
      to: path,
      search: () => ({ q: currentTabText }),
    });
  };

  return (
    <div className="bg-page-bg inline-flex rounded-lg text-black dark:text-white">
      {options.map((option, index) => {
        const isActive = active === option;
        return (
          <button
            key={option}
            onClick={() => handleClick(option)}
            className={clsx(
              "flex items-center gap-2 border-b-2 border-r-2 border-t-2 border-gray-400 px-4 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-brand-violet text-white"
                : "bg-transparent hover:bg-[#e6e6e6] dark:hover:bg-[#1e1e1e]",
              index === 0 && "rounded-l-lg border-l-2",
              index === options.length - 1 && "rounded-r-lg",
            )}
          >
            <span className="h-4 w-4">
              {React.cloneElement(iconsMap[option], {
                stroke: isActive ? "white" : "#9747FF",
              })}
            </span>
            {option}
          </button>
        );
      })}
    </div>
  );
};

export default ToggleGroup;
