import { search } from "@/lib/search";
import clsx from "clsx";

export default function SearchResult({
  response,
  isSelected,
  select,
}: {
  response: search.SearchResponse;
  isSelected: boolean;
  select: () => void;
}) {
  return (
    <div
      onClick={() => select()}
      tabIndex={0}
      className={clsx(
        "flex cursor-pointer flex-col rounded-lg !border bg-sidebar p-4 hover:bg-primary-hover",
        isSelected
          ? "border-[#9747FF] drop-shadow-[0_0_4px_#9747FF]"
          : "border-gray-400",
      )}
    >
      {response.source.type === "moodle" ? (
        <span className="icon-[material-symbols--school-outline] text-3xl text-[#F27F22]" />
      ) : response.source.type === "telegram" ? (
        <span className="icon-[uil--telegram-alt] text-3xl text-[#27A7E7]" />
      ) : null}
      <p className="text-xs font-semibold text-base-content dark:text-white md:text-2xl">
        {response.source.display_name}
      </p>
      <a
        href={response.source.link}
        target="_blank"
        onClickCapture={(e) => e.stopPropagation()}
        className="w-fit max-w-full truncate text-xs text-breadcrumbs hover:underline"
      >
        {response.source.breadcrumbs.join(" > ")}
      </a>
    </div>
  );
}
