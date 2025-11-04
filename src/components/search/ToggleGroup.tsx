import { Link } from "@tanstack/react-router";

const ToggleGroup = ({
  currentTabText,
}: {
  currentTabText: string | undefined;
}) => {
  return (
    <div className="bg-page-bg inline-flex text-black lg:pt-[5px] dark:text-white">
      <Link
        to="/search"
        search={{ q: currentTabText || undefined }}
        className="flex w-[90px] justify-center bg-transparent px-4 font-medium transition-colors hover:bg-[#e6e6e6] dark:hover:bg-[#1e1e1e]"
        activeOptions={{ exact: true, includeSearch: false }}
        activeProps={{ className: "border-b-2 border-primary" }}
      >
        <span className="pt-4 pb-2 lg:pt-6">Search</span>
      </Link>
      <Link
        to="/search/ask"
        search={{ q: currentTabText || undefined }}
        className="flex w-[90px] justify-center bg-transparent px-4 font-medium transition-colors hover:bg-[#e6e6e6] dark:hover:bg-[#1e1e1e]"
        activeOptions={{ exact: true, includeSearch: false }}
        activeProps={{ className: "border-b-2 border-primary" }}
      >
        <span className="pt-4 pb-2 lg:pt-6">Ask</span>
      </Link>
    </div>
  );
};

export default ToggleGroup;
