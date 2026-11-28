import { searchTypes } from "@/api/search";
import { EduwikiSourceType } from "@/api/search/types";
import { SourcePreviewModal } from "@/components/search/SourcePreviewModal";
import { Trans } from "@lingui/react/macro";
import { useState } from "react";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { isPdfUrl } from "./AskResult";

type Source = searchTypes.SchemaSearchResponse["source"];

function linkOf(source: Source): string {
  return "url" in source ? source.url : source.link;
}

function previewTextOf(source: Source): string {
  return "preview_text" in source ? source.preview_text.trim() : "";
}

// An archive document and a PDF are shown in the page; any other source is a page of its own site
function isPreviewable(source: Source): boolean {
  if (!("url" in source)) return false;
  return (
    (source.type === EduwikiSourceType.eduwiki && !!source.archive_document) ||
    isPdfUrl(source.url)
  );
}

// The card as a whole is the link, so the markdown of the text keeps no links, images or headings of its own
const previewMarkdown: Components = {
  a: ({ children }) => <>{children}</>,
  img: () => null,
  h1: ({ children }) => <p className="font-medium">{children}</p>,
  h2: ({ children }) => <p className="font-medium">{children}</p>,
  h3: ({ children }) => <p className="font-medium">{children}</p>,
  h4: ({ children }) => <p className="font-medium">{children}</p>,
  h5: ({ children }) => <p className="font-medium">{children}</p>,
  h6: ({ children }) => <p className="font-medium">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5">{children}</ol>,
  pre: ({ children }) => <pre className="overflow-hidden">{children}</pre>,
};

// The results of the search API as cards: the title, the beginning of the text and where it is from. A click opens the
// source: a document in a window over the chat, anything else on its own site
export function SearchResults({
  query,
  results,
}: {
  query: string;
  results: searchTypes.SchemaSearchResponse[];
}) {
  const [preview, setPreview] = useState<Source>();

  return (
    <div className="flex w-full min-w-0 flex-col gap-2 self-start">
      <span className="text-base-content/70 text-sm wrap-anywhere">
        {results.length > 0 ? (
          <Trans>Search results: {query}</Trans>
        ) : (
          <Trans>Nothing found: {query}</Trans>
        )}
      </span>
      {results.length > 0 && (
        <ul className="grid grid-cols-1 gap-2 @2xl/content:grid-cols-2">
          {results.map(({ source }, index) => {
            const previewable = isPreviewable(source);
            const text = previewTextOf(source);
            const body = (
              <>
                <span className="flex items-start justify-between gap-2">
                  <span
                    className="line-clamp-2 font-medium wrap-anywhere"
                    title={source.display_name}
                  >
                    {source.display_name}
                  </span>
                  <span
                    className={
                      previewable
                        ? "icon-[material-symbols--preview-outline-rounded] mt-1 shrink-0"
                        : "icon-[material-symbols--open-in-new-rounded] mt-1 shrink-0"
                    }
                  />
                </span>
                {text && (
                  <div className="text-base-content/70 max-h-20 overflow-hidden [mask-image:linear-gradient(to_bottom,black_60%,transparent)] text-sm wrap-anywhere">
                    <Markdown
                      remarkPlugins={[remarkGfm]}
                      components={previewMarkdown}
                    >
                      {text}
                    </Markdown>
                  </div>
                )}
                <span className="badge badge-sm badge-soft mt-auto max-w-full">
                  <span className="truncate">
                    {source.breadcrumbs.join(" / ")}
                  </span>
                </span>
              </>
            );
            const className =
              "border-base-300 bg-base-200 hover:border-primary rounded-field flex h-full w-full min-w-0 flex-col gap-2 border p-3 text-left transition-colors";
            return (
              <li key={`${index}:${linkOf(source)}`} className="min-w-0">
                {previewable ? (
                  <button
                    type="button"
                    className={className}
                    onClick={() => setPreview(source)}
                  >
                    {body}
                  </button>
                ) : (
                  <a
                    href={linkOf(source)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={className}
                  >
                    {body}
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {preview && (
        <SourcePreviewModal
          source={preview}
          onClose={() => setPreview(undefined)}
        />
      )}
    </div>
  );
}
