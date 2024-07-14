import TelegramPreview from "@/components/search/TelegramPreview";
import { search } from "@/lib/search";
import clsx from "clsx";
import dynamic from "next/dynamic";
import { ErrorBoundary } from "react-error-boundary";

export const PdfPreview = dynamic(
  () => import("./PdfPreview").then((x) => x.default),
  { ssr: false },
);

export declare type PreviewCardProps = {
  source: search.SearchResponseSource;
  onClose: () => void;
};

export default function PreviewCard({ source, onClose }: PreviewCardProps) {
  return (
    <div
      className={clsx(
        "flex h-fit max-h-full min-w-0 flex-col gap-2 rounded-lg border border-default bg-sidebar p-4 md:basis-1/2",
        "fixed inset-8 top-8 z-10 md:visible md:static",
      )}
    >
      <div className="flex flex-row items-center justify-between">
        <p className="text-2xl font-semibold text-base-content dark:text-white">
          {source.display_name}
        </p>
        <span
          className="icon-[material-symbols--close] text-2xl md:invisible"
          onClick={onClose}
        />
      </div>
      <a href={source?.link} target="_blank" className="w-fit max-w-full">
        <p className="truncate pb-3 text-xs font-normal text-breadcrumbs hover:underline">
          {source.breadcrumbs.join(" > ")}
        </p>
      </a>

      <ErrorBoundary fallback={<div>Some error occurred</div>}>
        {source.type === "moodle" ? (
          <PdfPreview source={source} searchText="" />
        ) : source.type === "telegram" ? (
          <TelegramPreview source={source} />
        ) : null}
      </ErrorBoundary>
    </div>
  );
}
