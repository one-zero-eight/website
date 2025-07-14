import { searchTypes } from "@/api/search";
import clsx from "clsx";
import TruncatableMarkdown from "./TruncatableMarkdown";

export default function SearchResult({
  response,
  isSelected,
  isMobile,
  select,
}: {
  response: searchTypes.SchemaSearchResponse;
  isSelected: boolean;
  isMobile: boolean;
  select: () => void;
}) {
  const link =
    "link" in response.source
      ? response.source.link
      : "url" in response.source
        ? response.source.url
        : "";
  const previewText =
    "preview_text" in response.source ? response.source.preview_text : "";

  const handleClick = () => {
    if (isMobile && link) {
      window.open(link, "_blank");
    }
    select();
  };

  const getIcon = () => {
    const base = "text-2xl md:text-3xl";
    switch (response.source.type) {
      case "moodle-file":
      case "moodle-url":
      case "moodle-unknown":
        return (
          <span
            className={`icon-[material-symbols--school-outline] ${base} text-[#F27F22]`}
          />
        );
      case "telegram":
        return (
          <span className={`icon-[uil--telegram-alt] ${base} text-[#27A7E7]`} />
        );
      case "campuslife":
        return (
          <span
            className={`icon-[hugeicons--university] ${base} text-[#F7922D]`}
          />
        );
      case "hotel":
        return (
          <span
            className={`icon-[material-symbols--hotel-rounded] ${base} text-[#27A7E7]`}
          />
        );
      case "eduwiki":
        return (
          <span
            className={`icon-[flat-color-icons--wikipedia] ${base} text-[#3EDF51]`}
          />
        );
      case "maps":
        return (
          <span
            className={`icon-[material-symbols-light--map-outline] ${base} text-[#F7922D]`}
          />
        );
      case "residents":
        return (
          <span
            className={`icon-[material-symbols-light--home-outline-rounded] ${base} text-[#27A7E7]`}
          />
        );
      default:
        return (
          <span className={`icon-[quill--search] ${base} text-brand-violet`} />
        );
    }
  };

  return (
    <div
      onClick={handleClick}
      tabIndex={0}
      className={clsx(
        "relative grid cursor-pointer grid-cols-[2rem_1fr_auto] items-start gap-4 rounded-lg !border bg-floating p-4 hover:bg-primary-hover",
        isSelected
          ? "border-brand-violet drop-shadow-[0_0_4px_#9747FF]"
          : "border-gray-400",
      )}
    >
      <div className="flex items-start justify-center">{getIcon()}</div>

      <div className="flex flex-col gap-2 overflow-hidden">
        <p className="truncate text-xs font-semibold dark:text-white md:text-2xl">
          {response.source.display_name}
        </p>
        <div>
          <a
            href={link}
            target="_blank"
            onClickCapture={(e) => e.stopPropagation()}
            className="truncate text-xs text-[#93bd58] hover:underline"
          >
            {response.source.breadcrumbs.join(" > ")}
          </a>
        </div>
        {previewText && (
          <TruncatableMarkdown
            text={previewText}
            sourse_type={response.source.type}
          />
        )}
      </div>
    </div>
  );
}
