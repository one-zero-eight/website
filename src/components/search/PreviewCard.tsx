import { searchTypes } from "@/api/search";
import TelegramPreview from "@/components/search/TelegramPreview";
import clsx from "clsx";
import { lazy, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import MoodleUnknownPreview from "./MoodleUnknownPreview";
import MoodleUrlPreview from "./MoodleUrlPreview";

const PdfPreview = lazy(() => import("./PdfPreview"));

export declare type PreviewCardProps = {
  source: searchTypes.SchemaSearchResponse["source"];
  onClose: () => void;
};

export default function PreviewCard({ source, onClose }: PreviewCardProps) {
  return (
    <div
      className={clsx(
        "flex h-full min-w-0 flex-col gap-4 rounded-xl border border-secondary-hover bg-floating p-4",
        "overflow-hidden",
      )}
    >
      <div className="flex flex-row items-center justify-between">
        <p className="text-lg font-semibold dark:text-white sm:text-xl lg:text-2xl">
          {source.display_name}
        </p>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-200 hover:bg-secondary-hover"
        >
          <span className="icon-[material-symbols--close] text-xl" />
        </button>
      </div>

      {source?.link && (
        <a href={source.link} target="_blank" className="w-fit max-w-full">
          <p className="truncate text-xs font-normal text-[#93bd58] hover:underline">
            {source.breadcrumbs.join(" > ")}
          </p>
        </a>
      )}

      <div className="flex-1 overflow-auto">
        <ErrorBoundary
          fallback={
            <div className="flex h-full items-center justify-center">
              <div className="text-center text-contrast/50">
                <span className="icon-[material-symbols--error-outline] text-4xl" />
                <p className="mt-2">Failed to load preview</p>
              </div>
            </div>
          }
        >
          {source.type === "moodle-file" ? (
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center">
                  <span className="icon-[material-symbols--sync] animate-spin text-4xl text-brand-violet" />
                </div>
              }
            >
              <PdfPreview source={source} searchText="" />
            </Suspense>
          ) : source.type === "telegram" ? (
            <TelegramPreview source={source} />
          ) : source.type === "moodle-url" ? (
            <MoodleUrlPreview source={source} />
          ) : source.type === "moodle-unknown" ? (
            <MoodleUnknownPreview source={source} />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center text-contrast/50">
                <span className="icon-[material-symbols--preview] text-4xl" />
                <p className="mt-2">Preview not available</p>
              </div>
            </div>
          )}
        </ErrorBoundary>
      </div>
    </div>
  );
}
