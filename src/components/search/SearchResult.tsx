import { searchTypes } from "@/api/search";
import clsx from "clsx";

export default function SearchResult({
  response,
  isSelected,
  select,
  hasPreview,
}: {
  response: searchTypes.SchemaSearchResponse;
  isSelected: boolean;
  select: () => void;
  hasPreview?: boolean;
}) {
  const link =
    "link" in response.source
      ? response.source.link
      : "url" in response.source
        ? response.source.url
        : "";

  const handleClick = () => {
    if (
      response.source.type !== "moodle-file" &&
      response.source.type !== "moodle-url" &&
      response.source.type !== "moodle-unknown" &&
      response.source.type !== "telegram"
    ) {
      select();
      if (link) {
        window.open(link, "_blank");
      }
    }
  };
  return (
    <div
      onClick={handleClick}
      tabIndex={0}
      className={clsx(
        "relative flex cursor-pointer flex-col rounded-lg !border bg-floating p-4 hover:bg-primary-hover",
        isSelected
          ? "border-brand-violet drop-shadow-[0_0_4px_#9747FF]"
          : "border-gray-400",
      )}
    >
      {!hasPreview && (
        <span className="text-muted-foreground icon-[akar-icons--link-out] absolute right-2 top-2 text-lg text-black dark:text-white" />
      )}
      {response.source.type === "moodle-file" ? (
        <span className="icon-[material-symbols--school-outline] text-3xl text-[#F27F22]" />
      ) : response.source.type === "moodle-url" ? (
        <span className="icon-[material-symbols--school-outline] text-3xl text-[#F27F22]" />
      ) : response.source.type === "moodle-unknown" ? (
        <span className="icon-[material-symbols--school-outline] text-3xl text-[#F27F22]" />
      ) : response.source.type === "telegram" ? (
        <span className="icon-[uil--telegram-alt] text-3xl text-[#27A7E7]" />
      ) : response.source.type === "campuslife" ? (
        <span className="icon-[hugeicons--university] text-3xl text-[#F7922D]" />
      ) : response.source.type === "hotel" ? (
        <span className="icon-[material-symbols--hotel-rounded] text-3xl text-[#27A7E7]" />
      ) : response.source.type === "eduwiki" ? (
        <span className="icon-[flat-color-icons--wikipedia] text-3xl text-[#3EDF51]" />
      ) : null}
      <p className="text-xs font-semibold dark:text-white md:text-2xl">
        {response.source.display_name}
      </p>
      <a
        href={link}
        target="_blank"
        onClickCapture={(e) => e.stopPropagation()}
        className="w-fit max-w-full truncate text-xs text-[#93bd58] hover:underline"
      >
        {response.source.breadcrumbs.join(" > ")}
      </a>
    </div>
  );
}
