import { Trans, useLingui } from "@lingui/react/macro";
import { $search, searchTypes } from "@/api/search";
import { SEARCH_API_URL } from "@/api/search/links.ts";
import { usePreviewFile } from "@/api/search/use-preview-file.ts";
import { cn } from "@/lib/ui/cn";
import { useEffect, useState } from "react";
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
const pdfFileRegex = /\.pdf$/i;

// The university's sites forbid showing their files in a frame of another site (X-Frame-Options: SAMEORIGIN):
// the search API gives the PDF of a document of the knowledge base, and the frame shows it from a blob URL of this site
function usePdfObjectUrl(url: string | undefined) {
  const { data: file, isPending } = usePreviewFile(
    url
      ? `${SEARCH_API_URL}/search/pdf?url=${encodeURIComponent(url)}`
      : undefined,
  );
  const pdf: Blob | undefined = file?.response.ok ? file.data : undefined;
  const [objectUrl, setObjectUrl] = useState<string>();

  useEffect(() => {
    if (!pdf) {
      setObjectUrl(undefined);
      return;
    }
    const created = URL.createObjectURL(
      new Blob([pdf], { type: "application/pdf" }),
    );
    setObjectUrl(created);
    return () => URL.revokeObjectURL(created);
  }, [pdf]);

  return {
    objectUrl,
    isPending: !!url && (isPending || (!!pdf && !objectUrl)),
  };
}

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
  if (source.type === "eduwiki" && source.archive_document) {
    return (
      <ArchiveDocumentPreview
        key={JSON.stringify(source.archive_document)}
        source={source}
        document={source.archive_document}
        onClose={onClose}
      />
    );
  }
  return <OrdinaryPreviewCard source={source} onClose={onClose} />;
}

function ArchiveDocumentPreview({
  source,
  document,
  onClose,
}: {
  source: searchTypes.SchemaEduwikiSource;
  document: NonNullable<searchTypes.SchemaEduwikiSource["archive_document"]>;
  onClose: () => void;
}) {
  const { t } = useLingui();
  const query = new URLSearchParams({
    page: document.page,
    revision: document.revision,
  });
  const {
    data: file,
    isPending,
    isError,
  } = usePreviewFile(`${SEARCH_API_URL}/search/archive-document?${query}`);
  const pdf = !isError && file?.response.ok ? file.data : undefined;
  const [preview, setPreview] = useState<{ pdf: Blob; url: string }>();
  const objectUrl = preview?.pdf === pdf ? preview?.url : undefined;
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!pdf) return;
    const created = URL.createObjectURL(
      new Blob([pdf], { type: "application/pdf" }),
    );
    setPreview({ pdf, url: created });
    return () => URL.revokeObjectURL(created);
  }, [pdf]);

  return (
    <div className="border-base-300 bg-base-200 rounded-field flex w-full min-w-0 flex-col gap-2 border p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 text-lg font-semibold wrap-break-word">
          {source.display_name}
        </p>
        <button
          type="button"
          onClick={onClose}
          title={t`Close`}
          className="btn btn-circle btn-ghost btn-sm"
        >
          ✕
        </button>
      </div>
      <p className="text-sm wrap-anywhere">{document.member}</p>
      {isPending || (pdf && !objectUrl) ? (
        <div
          role="status"
          className="flex h-[50vh] w-full flex-col items-center justify-center gap-3 rounded-xl"
        >
          <span className="loading loading-spinner loading-lg text-primary" />
          <span className="text-base-content/70 text-sm">
            <Trans>Loading...</Trans>
          </span>
        </div>
      ) : objectUrl && !hasError ? (
        <iframe
          src={objectUrl}
          onErrorCapture={() => setHasError(true)}
          title={t`Preview`}
          className="border-border h-[50vh] w-full rounded-xl border"
        />
      ) : (
        <p className="text-error p-4">
          <Trans>
            Could not open this archive document. It may be missing or changed.
          </Trans>
        </p>
      )}
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary self-center hover:underline"
      >
        <Trans>Open original archive</Trans>
      </a>
    </div>
  );
}

function OrdinaryPreviewCard({
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
  const isPdf = pdfFileRegex.test(parsedUrl.pathname);

  const isExternalPage =
    !!url && !hasError && !component && !isDownloadableFile;

  const { objectUrl: pdfObjectUrl, isPending: isPdfPending } = usePdfObjectUrl(
    isExternalPage && isPdf ? url : undefined,
  );

  // Many sites forbid showing them in a frame: the knowledge base holds the text of the page, if it has the page
  const { data: wikiPage, isPending: isWikiPagePending } = $search.useQuery(
    "get",
    "/search/page",
    { params: { query: { url } } },
    {
      // A PDF the API could not give: its text in the knowledge base
      enabled: isExternalPage && !isPdfPending && !pdfObjectUrl,
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
      ) : isPdfPending ? (
        <div
          role="status"
          className="flex h-[50vh] w-full flex-col items-center justify-center gap-3 rounded-xl"
        >
          <span className="loading loading-spinner loading-lg text-primary" />
          <span className="text-base-content/70 text-sm">
            <Trans>Loading...</Trans>
          </span>
        </div>
      ) : pdfObjectUrl ? (
        <iframe
          src={pdfObjectUrl}
          title={t`Preview`}
          className="border-border h-[50vh] w-full rounded-xl border"
        />
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
