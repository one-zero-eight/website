import { useRouter } from "@tanstack/react-router";
import clsx from "clsx";

const options = ["Search", "Ask", "Act"] as const;
type Option = (typeof options)[number];

const ToggleGroup = ({ currentTabText }: { currentTabText: string }) => {
  const router = useRouter();
  const pathname = router.state.location.pathname;

  const active =
    options.find((opt) => pathname.includes(opt.toLowerCase())) || "Search";

  const handleClick = (option: Option) => {
    const path = `/${option.toLowerCase()}`;
    router.navigate({
      to: path,
      search: { q: currentTabText },
    });
  };

  return (
    <div className="bg-page-bg inline-flex text-black dark:text-white lg:pt-[5px]">
      {options.map((option) => {
        const isActive = active === option;
        return (
          <button
            type="button"
            key={option}
            onClick={() => handleClick(option)}
            className={clsx(
              "flex w-[90px] justify-center bg-transparent px-4 font-medium transition-colors hover:bg-[#e6e6e6] dark:hover:bg-[#1e1e1e]",
              isActive ? "border-b-2 border-brand-violet text-white" : "",
            )}
          >
            <span className="pb-2 pt-4 lg:pt-6">{option}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ToggleGroup;
