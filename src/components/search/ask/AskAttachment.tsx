import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { $search, type searchTypes } from "@/api/search";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { useEffect, useRef, useState } from "react";

export function AttachmentLabel({
  attachment,
}: {
  attachment: searchTypes.SchemaAttachmentInfo;
}) {
  const { i18n } = useLingui();
  const size = i18n.number(attachment.size_bytes);
  return (
    <span className="flex min-w-0 flex-col text-left">
      <span className="truncate" title={attachment.filename}>
        {attachment.filename}
      </span>
      <span className="text-xs opacity-70">
        <Trans>{size} bytes</Trans>
        {attachment.pages != null && (
          <>
            {" "}
            · <Plural value={attachment.pages} one="# page" other="# pages" />
          </>
        )}
      </span>
    </span>
  );
}

// Never put authenticated API URLs in links or images. Fetch a private blob on demand.
export function AskAttachment({
  attachment,
}: {
  attachment: searchTypes.SchemaAttachmentInfo;
}) {
  const { t } = useLingui();
  const { refetch, isFetching, error } = $search.useQuery(
    "get",
    "/ask/attachments/{attachment_id}/content",
    {
      params: { path: { attachment_id: attachment.id } },
      parseAs: "blob",
      cache: "no-store",
    },
    { enabled: false, gcTime: 0, staleTime: 0, retry: false },
  );
  const [downloadError, setDownloadError] = useState<unknown>(null);
  const active = useRef(false);
  const downloads = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useEffect(() => {
    active.current = true;
    const urls = downloads.current;
    return () => {
      active.current = false;
      urls.forEach((timer, url) => {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
      });
      urls.clear();
    };
  }, []);
  const handleDownload = async () => {
    setDownloadError(null);
    try {
      const result = await refetch();
      if (!active.current) return;
      if (result.error) throw result.error;
      if (!result.data) return;
      const url = URL.createObjectURL(result.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = attachment.filename;
      link.click();
      downloads.current.set(
        url,
        setTimeout(() => {
          URL.revokeObjectURL(url);
          downloads.current.delete(url);
        }, 1000),
      );
    } catch (error) {
      setDownloadError(error);
    }
  };
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <button
        type="button"
        title={t`Download attachment`}
        className="flex min-w-0 items-center gap-2 rounded border border-current/20 px-2 py-1 text-sm hover:bg-current/10"
        disabled={isFetching}
        onClick={handleDownload}
      >
        {isFetching ? (
          <span className="loading loading-spinner loading-sm" />
        ) : (
          <span className="icon-[material-symbols--download-rounded] shrink-0 text-lg" />
        )}
        <AttachmentLabel attachment={attachment} />
      </button>
      {(downloadError || error) && (
        <span className="text-sm">
          {formatApiErrorMessage(downloadError || error)}
        </span>
      )}
    </div>
  );
}
