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

  const previewText =
    "preview_text" in response.source ? response.source.preview_text : "";

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
    } else {
      select();
    }
  };

  const getIcon = () => {
    const base = "text-3xl";
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
        return <span className={`icon-[quill--search] ${base} text-white`} />;
    }
  };

  return (
    <div
      onClick={handleClick}
      tabIndex={0}
      className={clsx(
        "relative flex cursor-pointer gap-4 rounded-lg !border bg-floating p-4 hover:bg-primary-hover md:basis-1/2",
        isSelected
          ? "border-brand-violet drop-shadow-[0_0_4px_#9747FF]"
          : "border-gray-400",
      )}
    >
      <div className="mt-1 flex w-10 flex-shrink-0 items-start justify-center">
        {getIcon()}
      </div>

      <div className="flex flex-col gap-2 overflow-hidden">
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

        {previewText && <p className="truncate text-xs">{previewText}</p>}
      </div>

      {!hasPreview && (
        <span
          className={clsx(
            "absolute right-2 top-[16px]",
            "icon-[akar-icons--link-out]",
            "h-5 w-5",
            "text-muted-foreground text-black dark:text-white",
          )}
        />
      )}
    </div>
  );
}
