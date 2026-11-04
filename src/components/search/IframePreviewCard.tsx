import { Trans, useLingui } from "@lingui/react/macro";
import { $search, searchTypes } from "@/api/search";
import { cn } from "@/lib/ui/cn";
import { useState } from "react";
import { componentByPath, resolvePageByUrl } from "./innohassleRoutes";
import { MapsPage } from "../maps/MapsPage";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

function DynamicPageComponent({ url }: { url: string }) {
  const result = resolvePageByUrl(url);

  if (!result) {
    return (
      <div className="border-border text-muted flex h-[25vh] w-full items-center justify-center rounded-xl border p-4 text-center md:h-[50vh]">
        <Trans>
          Sorry, this site does not support preview. Please, open it directly.
        </Trans>
      </div>
    );
  }

  const { Component, props } = result;
  return <Component {...props} />;
}

const downloadableFileRegex = /\.(docx?|xlsx?|pptx?|odt|ods|odp|rtf|zip|rar)$/i;

function WikiPageText({ text }: { text: string }) {
  return (
    <div className="border-border h-[50vh] w-full overflow-auto rounded-xl border p-4 text-sm">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Links inside the knowledge base ("/raw/...") do not lead anywhere on this site
          a: ({ href, children }) =>
            href?.startsWith("/") ? (
              <span>{children}</span>
            ) : (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {children}
              </a>
            ),
          p: ({ children }) => <p className="mb-2">{children}</p>,
          img: ({ src, alt }) => (
            <img src={src} alt={alt} className="my-2 max-h-48 rounded-lg" />
          ),
          h1: ({ children }) => (
            <h1 className="mb-2 text-xl font-semibold">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-3 mb-2 text-lg font-semibold">{children}</h2>
          ),
          li: ({ children }) => <li className="ml-5 list-disc">{children}</li>,
          table: ({ children }) => (
            <div className="my-2 overflow-x-auto">
              <table className="border-base-300 w-full border-collapse border">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-base-300 bg-base-200 border px-2 py-1 text-left">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-base-300 border px-2 py-1 align-top">
              {children}
            </td>
          ),
        }}
      >
        {/* Markdown here does not render HTML, and the tables of the knowledge base use <br> for a line break in a cell */}
        {text.replace(/\s*<br\s*\/?>\s*/gi, " / ")}
      </Markdown>
    </div>
  );
}

export default function IframePreviewCard({
  source,
  onClose,
}: {
  source: searchTypes.SchemaSearchResponse["source"];
  onClose: () => void;
}) {
  const { t } = useLingui();
  const [hasError, setHasError] = useState(false);

  const url = "url" in source ? source.url : "";
  const parsedUrl = new URL(url);

  const component = componentByPath[parsedUrl.pathname];
  const isInnohassleComponent = !!component;

  const isInsecureUrl =
    url.startsWith("http://") ||
    url.startsWith("https://hotel.innopolis.university/") ||
    url.startsWith("https://help.university.innopolis.ru/") ||
    url.startsWith("https://disk.yandex.ru/") ||
    url.startsWith("https://my.innopolis.university/");

  const isDownloadableFile = downloadableFileRegex.test(parsedUrl.pathname);

  const isExternalPage =
    !!url && !hasError && !component && !isDownloadableFile;

  // Many sites forbid showing them in a frame: the knowledge base holds the text of the page, if it has the page
  const { data: wikiPage, isPending: isWikiPagePending } = $search.useQuery(
    "get",
    "/search/page",
    { params: { query: { url } } },
    {
      enabled: isExternalPage,
      retry: false,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );

  return (
    <div
      className={cn(
        "border-base-300 bg-base-200 rounded-field flex h-fit max-h-full w-full min-w-0 flex-col gap-2 border p-4",
        "fixed static inset-8 top-8 z-8 md:sticky md:inset-0 md:top-4",
      )}
    >
      <div className="flex flex-row items-center justify-between">
        <p className="truncate text-xs font-semibold md:text-2xl dark:text-white">
          {source.display_name}
        </p>
        <button
          onClick={() => {
            onClose();
          }}
          className="bg-background hover:bg-accent items-end rounded-full px-2 py-1 text-sm shadow-md"
        >
          ✕
        </button>
      </div>
      {isDownloadableFile ? (
        <div className="border-border text-muted flex h-[25vh] w-full flex-col items-center justify-center gap-3 rounded-xl border p-4 text-center md:h-[50vh]">
          <p>
            <Trans>This file cannot be previewed in the browser.</Trans>
          </p>
          <a
            href={url}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            <span className="icon-[material-symbols--download]" />
            <Trans>Download</Trans>
          </a>
        </div>
      ) : isExternalPage && isWikiPagePending ? (
        <div className="skeleton h-[50vh] w-full rounded-xl" />
      ) : wikiPage ? (
        <WikiPageText text={wikiPage.text} />
      ) : !isInsecureUrl ? (
        <>
          {isInnohassleComponent ? (
            component.component === MapsPage ? (
              <div className="@container/content h-full overflow-hidden rounded-xl border!">
                <MapsPage
                  sceneId={parsedUrl.searchParams.get("scene") ?? undefined}
                  areaId={parsedUrl.searchParams.get("area") ?? undefined}
                  q={undefined}
                />
              </div>
            ) : (
              <div className="@container/content h-[50vh] w-full rounded-xl border!">
                <div className="h-full w-full overflow-hidden rounded-xl">
                  <div className="h-full w-full overflow-auto">
                    <DynamicPageComponent url={url} />
                  </div>
                </div>
              </div>
            )
          ) : (
            isExternalPage && (
              <iframe
                src={url}
                onError={() => setHasError(true)}
                title={t`Preview`}
                className="border-border h-[50vh] w-full rounded-xl border"
                loading="lazy"
              />
            )
          )}
        </>
      ) : (
        <div className="border-border text-muted flex h-[25vh] w-full items-center justify-center rounded-xl border p-4 text-center md:h-[50vh]">
          <Trans>
            Sorry, this site does not support preview. Please, open it directly.
          </Trans>
        </div>
      )}

      <div className="flex justify-center">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          <Trans>Go to website -&gt;</Trans>
        </a>
      </div>
    </div>
  );
}
