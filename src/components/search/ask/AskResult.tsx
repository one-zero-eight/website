import { searchTypes } from "@/api/search";
import clsx from "clsx";
import Markdown from "react-markdown";

export function AskResult({
  response,
}: {
  response: searchTypes.SchemaAskResponses;
}) {
  const { answer, search_responses } = response;

  return (
    <div
      tabIndex={0}
      className={clsx(
        "flex cursor-pointer flex-col gap-4 rounded-lg !border border-gray-400 bg-floating p-4 hover:bg-primary-hover",
      )}
    >
      <Markdown>{answer}</Markdown>
      <div>
        {"Source: "}
        <a
          className="text-brand-violet hover:underline"
          href={
            search_responses[0] &&
            ("link" in search_responses[0].source
              ? search_responses[0].source.link
              : "url" in search_responses[0].source
                ? search_responses[0].source.url
                : "")
          }
        >
          {search_responses[0] ? search_responses[0].source.type : "-"}
        </a>
      </div>
    </div>
  );
}
