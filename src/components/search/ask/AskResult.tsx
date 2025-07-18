import { searchTypes } from "@/api/search";
import clsx from "clsx";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function AskResult({
  response,
  hasError,
}: {
  response: searchTypes.SchemaAskResponses;
  hasError?: boolean;
}) {
  const { answer, search_responses } = response;

  const uniqueSources = search_responses.filter(
    (item, index, self) =>
      index === self.findIndex((s) => s.source.type === item.source.type),
  );

  const getSourceLink = (s: searchTypes.SchemaSearchResponse) =>
    "link" in s.source ? s.source.link : "url" in s.source ? s.source.url : "";

  return (
    <div
      tabIndex={0}
      className={clsx(
        "flex flex-col gap-2 self-start rounded-lg !border border-inactive bg-primary px-4 py-2 text-white",
      )}
    >
      {!hasError ? (
        <Markdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ href }) => (
              <a
                href={href ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-violet hover:underline"
              >
                {"link"}
              </a>
            ),
            p: ({ children }) => (
              <p className="whitespace-pre-wrap">{children}</p>
            ),
            li: ({ children }) => (
              <li className="ml-5 list-disc">{children}</li>
            ),
          }}
        >
          {answer}
        </Markdown>
      ) : (
        <span>- Sorry, I can't help you with this question.</span>
      )}

      {uniqueSources.length > 0 && (
        <div>
          <span>Sources: </span>
          {uniqueSources.map((s, i) => {
            const link = getSourceLink(s);
            return (
              <span key={link || i}>
                <a
                  className="text-brand-violet hover:underline"
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {s.source.type}
                </a>
                {i < uniqueSources.length - 1 && ", "}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
