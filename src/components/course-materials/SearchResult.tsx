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
        "bg-floating hover:bg-primary-hover flex cursor-pointer flex-col rounded-lg border! p-4",
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
      ) : null}
      <p className="text-xs font-semibold md:text-2xl dark:text-white">
        {response.source.display_name}
      </p>
      <a
        href={response.source.link}
        target="_blank"
        onClickCapture={(e) => e.stopPropagation()}
        className="w-fit max-w-full truncate text-xs text-[#93bd58] hover:underline"
      >
        {response.source.breadcrumbs.join(" > ")}
      </a>
    </div>
  );
}
