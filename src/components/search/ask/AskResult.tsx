import { searchTypes } from "@/api/search";
import clsx from "clsx";

export function AskResult({
  response,
}: {
  response: searchTypes.SchemaSearchResponse;
}) {
  const link =
    "link" in response.source
      ? response.source.link
      : "url" in response.source
        ? response.source.url
        : "";

  return (
    <div
      tabIndex={0}
      className={clsx(
        "flex cursor-pointer flex-col rounded-lg !border border-gray-400 bg-floating p-4 hover:bg-primary-hover",
      )}
    >
      {link}
    </div>
  );
}
