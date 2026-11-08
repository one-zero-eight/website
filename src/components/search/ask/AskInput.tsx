import { $search } from "@/api/search";
import {
  formatApiErrorMessage,
  isApiHttpError,
} from "@/api/helpers/create-query-client";
import { useLingui } from "@lingui/react/macro";
import { useEffect, useRef, useState } from "react";
import type { DraftAttachment } from "./ask-session";
import { AttachmentLabel } from "./AskAttachment";

// Enter sends; Shift+Enter starts a new line. Uploads are private drafts until sent.
export function AskInput({
  text,
  setText,
  onSend,
  onStop,
  isPending,
  attachments,
  onAttachmentsChange,
}: {
  text: string;
  setText: (text: string) => void;
  onSend: (query: string) => void;
  onStop: () => void;
  isPending: boolean;
  attachments: DraftAttachment[];
  onAttachmentsChange: (attachments: DraftAttachment[]) => void;
}) {
  const { t } = useLingui();
  const fileInput = useRef<HTMLInputElement>(null);
  const draft = useRef(attachments);
  const busy = useRef(false);
  const controllerRef = useRef<AbortController | null>(null);
  const [removing, setRemoving] = useState(false);
  const [uploading, setUploading] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const previews = useRef(new Map<string, string>());
  useEffect(() => {
    const urls = previews.current;
    return () => {
      controllerRef.current?.abort();
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);
  useEffect(() => {
    draft.current = attachments;
  }, [attachments]);
  useEffect(() => {
    previews.current.forEach((url, id) => {
      if (!attachments.some((item) => item.info.id === id)) {
        URL.revokeObjectURL(url);
        previews.current.delete(id);
      }
    });
  }, [attachments]);
  const { mutateAsync: upload } = $search.useMutation(
    "post",
    "/ask/attachments",
  );
  const { mutateAsync: remove } = $search.useMutation(
    "delete",
    "/ask/attachments/{attachment_id}",
  );

  const handleFiles = async (files: File[]) => {
    if (busy.current || isPending || removing) return;
    setError(null);
    if (draft.current.length + files.length > 3) {
      setError(t`You can attach up to 3 files.`);
      return;
    }
    if (files.some((file) => !/\.(pdf|txt|png|jpe?g|webp)$/i.test(file.name))) {
      setError(t`Choose PDF, TXT, PNG, JPEG or WebP files.`);
      return;
    }
    if (files.some((file) => file.size > 10 * 1024 * 1024)) {
      setError(t`Each file must be no larger than 10 MiB.`);
      return;
    }
    busy.current = true;
    const controller = new AbortController();
    controllerRef.current = controller;
    setUploading(files.map((file) => file.name));
    try {
      for (const file of files) {
        const info = await upload({
          params: {
            header: { "X-Attachment-Filename": encodeURIComponent(file.name) },
          },
          headers: { "Content-Type": "application/octet-stream" },
          body: "",
          bodySerializer: () => file,
          signal: controller.signal,
        });
        if (controller.signal.aborted) {
          await remove({ params: { path: { attachment_id: info.id } } });
          return;
        }
        if (info.media_type.startsWith("image/"))
          previews.current.set(info.id, URL.createObjectURL(file));
        draft.current = [...draft.current, { info }];
        onAttachmentsChange(draft.current);
        setUploading((remaining) => remaining.slice(1));
      }
    } catch (error) {
      if (!controller.signal.aborted) setError(formatApiErrorMessage(error));
    } finally {
      if (controllerRef.current === controller) {
        busy.current = false;
        setUploading([]);
      }
    }
  };
  const handleRemove = async (attachment: DraftAttachment) => {
    if (busy.current || isPending || removing) return;
    setRemoving(true);
    setError(null);
    try {
      if (!attachment.bound) {
        await remove({
          params: { path: { attachment_id: attachment.info.id } },
        }).catch((error: unknown) => {
          // Expired or already-discarded uploads are safe to forget locally.
          if (!isApiHttpError(error) || error.httpCode !== 404) throw error;
        });
      }
      onAttachmentsChange(
        attachments.filter((item) => item.info.id !== attachment.info.id),
      );
    } catch (error) {
      setError(formatApiErrorMessage(error));
    } finally {
      setRemoving(false);
    }
  };
  const handleSend = () => {
    if (
      isPending ||
      busy.current ||
      removing ||
      (!text.trim() && !attachments.length)
    )
      return;
    onSend(text.trim() || t`What is in the attached file?`);
  };
  return (
    <div
      className="border-base-300 bg-base-100 rounded-field focus-within:border-primary flex flex-col gap-2 border-2 p-2"
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes("Files")) event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        void handleFiles(Array.from(event.dataTransfer.files));
      }}
      onPaste={(event) => {
        const images = Array.from(event.clipboardData.files).filter((file) =>
          file.type.startsWith("image/"),
        );
        if (!images.length) return;
        event.preventDefault();
        void handleFiles(images);
      }}
    >
      {error && <p className="text-error text-sm">{error}</p>}
      {uploading.map((name, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <span className="loading loading-spinner loading-sm" />
          {name}
        </div>
      ))}
      {uploading.length > 0 && (
        <button
          type="button"
          title={t`Cancel upload`}
          className="btn btn-ghost btn-xs self-start"
          onClick={() => {
            controllerRef.current?.abort();
            controllerRef.current = null;
            busy.current = false;
            setUploading([]);
          }}
        >{t`Cancel upload`}</button>
      )}
      {attachments.map((attachment) => (
        <div
          key={attachment.info.id}
          className="flex items-center gap-2 text-sm"
        >
          {previews.current.has(attachment.info.id) && (
            <img
              src={previews.current.get(attachment.info.id)}
              alt={attachment.info.filename}
              className="size-16 rounded object-cover"
            />
          )}
          <AttachmentLabel attachment={attachment.info} />
          <button
            type="button"
            disabled={isPending || uploading.length > 0 || removing}
            className="btn btn-ghost btn-xs"
            title={t`Remove attachment`}
            onClick={() => handleRemove(attachment)}
          >
            <span className="icon-[material-symbols--close-rounded]" />
          </button>
        </div>
      ))}
      <div className="flex items-end gap-2">
        <input
          ref={fileInput}
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.txt,.png,.jpg,.jpeg,.webp"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = "";
            void handleFiles(files);
          }}
        />
        <button
          type="button"
          title={t`Attach files`}
          disabled={isPending || uploading.length > 0}
          className="btn btn-ghost btn-circle btn-sm"
          onClick={() => fileInput.current?.click()}
        >
          <span className="icon-[material-symbols--attach-file-rounded] text-lg" />
        </button>
        <textarea
          className="field-sizing-content max-h-48 min-h-8 min-w-0 grow resize-none bg-transparent px-2 py-1 text-base outline-hidden"
          rows={1}
          autoFocus
          placeholder={t`Ask a question...`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing)
              return;
            e.preventDefault();
            handleSend();
          }}
        />
        {isPending ? (
          <button
            type="button"
            className="btn btn-circle btn-sm btn-neutral"
            title={t`Stop`}
            onClick={onStop}
          >
            <span className="icon-[material-symbols--stop] text-lg" />
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-circle btn-sm btn-primary"
            title={t`Send`}
            disabled={
              (!text.trim() && !attachments.length) ||
              uploading.length > 0 ||
              removing
            }
            onClick={handleSend}
          >
            <span className="icon-[material-symbols--arrow-upward-rounded] text-lg" />
          </button>
        )}
      </div>
    </div>
  );
}
