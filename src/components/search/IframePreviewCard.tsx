import { searchTypes } from "@/api/search";
import clsx from "clsx";
import { useState } from "react";

export default function IframePreviewCard({
  source,
  onClose,
}: {
  source: searchTypes.SchemaSearchResponse["source"];
  onClose: () => void;
}) {
  const [hasError, setHasError] = useState(false);

  const url = "url" in source ? source.url : "";

  const isInsecureUrl = url.startsWith("http://");
  const showIframe = !!url && !hasError && !isInsecureUrl;

  return (
    <div
      className={clsx(
        "relative flex h-fit max-h-full min-w-0 flex-col gap-4 rounded-lg border border-secondary-hover bg-floating p-4 md:basis-1/2",
        "fixed inset-8 top-8 z-10 md:visible md:static",
      )}
    >
      <div className="flex justify-between">
        <p className="truncate text-xs font-semibold dark:text-white md:text-2xl">
          {source.display_name}
        </p>
        <button
          onClick={onClose}
          className="bg-background hover:bg-accent items-end rounded-full px-2 py-1 text-sm shadow-md"
        >
          ✕
        </button>
      </div>
      {showIframe ? (
        <iframe
          src={url}
          sandbox=""
          onError={() => setHasError(true)}
          title="Preview"
          className="border-border h-[50vh] w-full rounded-xl border"
          loading="lazy"
        />
      ) : (
        <div className="border-border text-muted flex h-[50vh] w-full items-center justify-center rounded-xl border p-4">
          {isInsecureUrl
            ? "This site does not support secure preview. Please, open it directly."
            : "Preview unavailable — try opening the website instead."}
        </div>
      )}
      <div className="flex justify-center">
        <a href={url} className="hover:underline">
          {"Go to website ->"}
        </a>
      </div>
    </div>
  );
}
