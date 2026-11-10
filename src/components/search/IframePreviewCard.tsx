import { Trans, useLingui } from "@lingui/react/macro";
import { searchTypes } from "@/api/search";
import { SEARCH_API_URL } from "@/api/search/links.ts";
import { usePreviewFile } from "@/api/search/use-preview-file.ts";
import { cn } from "@/lib/ui/cn";
import { useEffect, useState } from "react";
import { componentByPath, resolvePageByUrl } from "./innohassleRoutes";
import { MapsPage } from "../maps/MapsPage";
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

// The university's sites forbid showing their pages and files in a frame of another site (X-Frame-Options: SAMEORIGIN)
// and give no CORS: the search API gives the PDF, or the page without its scripts, of what the knowledge base has a copy
// of, and the frame shows it from a blob URL of this site
function useApiObjectUrl(
  path: "/search/pdf" | "/search/html",
  type: string,
  url: string | undefined,
) {
  const {
    data: file,
    isPending,
    isError,
  } = usePreviewFile(
    url ? `${SEARCH_API_URL}${path}?url=${encodeURIComponent(url)}` : undefined,
  );
  const body: Blob | undefined = file?.response.ok ? file.data : undefined;
  const [objectUrl, setObjectUrl] = useState<string>();

  useEffect(() => {
    if (!body) {
      setObjectUrl(undefined);
      return;
    }
    const created = URL.createObjectURL(new Blob([body], { type }));
    setObjectUrl(created);
    return () => URL.revokeObjectURL(created);
  }, [body, type]);

  return {
    objectUrl,
    isPending: !!url && (isPending || (!!body && !objectUrl)),
    // The knowledge base has a copy (not 404), but the API could not give it
    isFailed:
      !!url &&
      !isPending &&
      (isError ||
        (!!file && !file.response.ok && file.response.status !== 404)),
  };
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

  const pdf = useApiObjectUrl(
    "/search/pdf",
    "application/pdf",
    isExternalPage && isPdf ? url : undefined,
  );
  const page = useApiObjectUrl(
    "/search/html",
    "text/html;charset=utf-8",
    isExternalPage && !isPdf ? url : undefined,
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
      ) : pdf.isPending ? (
        <div
          role="status"
          className="flex h-[50vh] w-full flex-col items-center justify-center gap-3 rounded-xl"
        >
          <span className="loading loading-spinner loading-lg text-primary" />
          <span className="text-base-content/70 text-sm">
            <Trans>Loading...</Trans>
          </span>
        </div>
      ) : pdf.objectUrl ? (
        <iframe
          src={pdf.objectUrl}
          title={t`Preview`}
          className="border-border h-[50vh] w-full rounded-xl border"
        />
      ) : page.isPending ? (
        <div className="skeleton h-[50vh] w-full rounded-xl" />
      ) : page.objectUrl ? (
        <iframe
          src={page.objectUrl}
          sandbox="allow-popups allow-popups-to-escape-sandbox"
          title={t`Preview`}
          className="border-border h-[50vh] w-full rounded-xl border"
        />
      ) : !pdf.isFailed && !page.isFailed && !isInsecureUrl ? (
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
