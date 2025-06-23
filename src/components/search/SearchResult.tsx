import { searchTypes } from "@/api/search";
import clsx from "clsx";

export default function SearchResult({
  response,
  isSelected,
  select,
}: {
  response: searchTypes.SchemaSearchResponse;
  isSelected: boolean;
  select: () => void;
}) {
  return (
    <div
      onClick={() => select()}
      tabIndex={0}
      className={clsx(
        "flex cursor-pointer flex-col rounded-lg !border bg-floating p-4 hover:bg-primary-hover",
        isSelected
          ? "border-brand-violet drop-shadow-[0_0_4px_#9747FF]"
          : "border-gray-400",
      )}
    >
      {response.source.type === "moodle-file" ? (
        <span className="icon-[material-symbols--school-outline] text-3xl text-[#F27F22]" />
      ) : response.source.type === "moodle-url" ? (
        <span className="icon-[material-symbols--school-outline] text-3xl text-[#F27F22]" />
      ) : response.source.type === "moodle-unknown" ? (
        <span className="icon-[material-symbols--school-outline] text-3xl text-[#F27F22]" />
      ) : response.source.type === "telegram" ? (
        <span className="icon-[uil--telegram-alt] text-3xl text-[#27A7E7]" />
      ) : // ) : response.source.type === "web-site" ? (
      //   <span className="icon-[token--botanix] text-3xl text-[#27A7E7]" /> //TODO: Change to real website icon
      null}
      <p className="text-xs font-semibold dark:text-white md:text-2xl">
        {response.source.display_name}
      </p>
      {/* TODO: Change as any after fixing api types */}
      <a
        href={(response.source as any).link}
        target="_blank"
        onClickCapture={(e) => e.stopPropagation()}
        className="w-fit max-w-full truncate text-xs text-[#93bd58] hover:underline"
      >
        {response.source.breadcrumbs.join(" > ")}
      </a>
    </div>
  );
}
