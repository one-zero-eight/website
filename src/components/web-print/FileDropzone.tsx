import { Modal } from "@/components/common/Modal.tsx";
import { PdfDocumentPreview } from "@/components/web-print/PdfDocumentPreview.tsx";
import { cn } from "@/lib/ui/cn";
import { useCallback, useRef, useState, type ReactNode } from "react";

const ACCEPTABLE_FILE_EXTENSIONS =
  ".pdf,.doc,.xls,.docx,.xlsx,.png,.txt,.md,.jpg,.jpeg,.bmp,.odt,.ods";

const ACCEPTABLE_FILE_TYPES =
  "application/pdf,application/msword,application/vnd.ms-excel," +
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document," +
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet," +
  "image/png,text/plain,text/markdown,image/jpeg,image/bmp," +
  "application/vnd.oasis.opendocument.text," +
  "application/vnd.oasis.opendocument.spreadsheet";

const ACCEPTABLE_FILE_SIGNATURES = [
  [0x25, 0x50, 0x44, 0x46, 0x2d],
  [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1],
  [0x50, 0x4b, 0x03, 0x04],
  [0x50, 0x4b, 0x03, 0x04],
  [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  [0xef, 0xbb, 0xbf],
  [0xff, 0xfe],
  [0xfe, 0xff],
  [0xff, 0xfe, 0x00, 0x00],
  [0x00, 0x00, 0xfe, 0xff],
  [0xff, 0xd8, 0xff],
  [0xff, 0xd8, 0xff],
  [0x42, 0x4d],
  [0x50, 0x4b, 0x03, 0x04],
];

async function validateFile(file: File): Promise<ReactNode | null> {
  if (file.size > 20 * 1024 * 1024) {
    return (
      <>
        <p>File is too large!</p>
        <p>
          Max file size is <span className="font-bold">20MB</span>
        </p>
      </>
    );
  }

  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const signatureMatch = ACCEPTABLE_FILE_SIGNATURES.some((signature) =>
    signature.every((byte, i) => byte === bytes[i]),
  );

  if (!ACCEPTABLE_FILE_TYPES.includes(file.type) || !signatureMatch) {
    return (
      <>
        <p>Such file is not supported!</p>
        <div className="mt-2 grid grid-cols-3 gap-1 text-sm">
          {ACCEPTABLE_FILE_EXTENSIONS.split(",").map((ext) => (
            <span key={ext} className="badge badge-ghost badge-sm">
              {ext}
            </span>
          ))}
        </div>
      </>
    );
  }

  return null;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function FileDropzone({
  fileProcess,
  isFileProcessing,
  blobPreviewURL,
  downloadFileName,
  displayFileName,
  isFunctional,
  label = "Drag & drop a file here",
  variant = "default",
  pageCount,
  fileSize,
  totalPageCount,
  previewPages,
  loadingLabel = "Processing…",
}: {
  fileProcess: (file: File) => void;
  isFileProcessing: boolean;
  blobPreviewURL: string | undefined;
  downloadFileName: string | undefined;
  displayFileName?: string;
  isFunctional: boolean;
  label?: string;
  variant?: "default" | "print" | "scan";
  pageCount?: number;
  totalPageCount?: number;
  fileSize?: number;
  previewPages?: number[];
  loadingLabel?: string;
}) {
  const [alert, setAlert] = useState<ReactNode>();
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      const error = await validateFile(file);
      if (error) {
        setAlert(error);
        return;
      }
      if (!isFileProcessing) fileProcess(file);
    },
    [fileProcess, isFileProcessing],
  );

  function handleDragOver(event: React.DragEvent) {
    if (!isFunctional) return;
    event.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  async function handleDrop(event: React.DragEvent) {
    if (!isFunctional) return;
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.items[0]?.getAsFile();
    if (file) await handleFile(file);
  }

  async function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) await handleFile(file);
    event.target.value = "";
  }

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      className="hidden"
      accept={ACCEPTABLE_FILE_EXTENSIONS}
      onChange={handleInputChange}
      disabled={!isFunctional || isFileProcessing}
    />
  );

  if (variant === "print" || variant === "scan") {
    const hasDocument = !!blobPreviewURL;
    const isScan = variant === "scan";

    const processingOverlay = isFileProcessing && (
      <div className="bg-base-100 absolute inset-0 flex flex-col items-center justify-center gap-2">
        <span className="loading loading-spinner loading-lg text-primary" />
        <p className="text-base-content/50 text-sm">{loadingLabel}</p>
      </div>
    );

    const fileLabel = displayFileName ?? downloadFileName;

    return (
      <>
        <div className="flex max-h-[calc(100vh-11rem)] min-h-80 flex-1 flex-col gap-3 overflow-hidden">
          {hasDocument && (
            <div className="bg-base-200 rounded-box flex shrink-0 items-center gap-3 px-3 py-2.5">
              <span
                className={cn(
                  "shrink-0 text-2xl",
                  isScan
                    ? "icon-[material-symbols--picture-as-pdf-rounded] text-primary"
                    : "icon-[material-symbols--description-rounded] text-primary",
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {fileLabel ?? (isScan ? "Scan result" : "Document")}
                </p>
                <p className="text-base-content/50 text-xs">
                  {[
                    pageCount
                      ? totalPageCount && pageCount < totalPageCount
                        ? `${pageCount} of ${totalPageCount} pages`
                        : `${pageCount} page${pageCount !== 1 ? "s" : ""}`
                      : null,
                    fileSize ? formatFileSize(fileSize) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              {pageCount ? (
                <span className="badge badge-primary badge-sm shrink-0">
                  {pageCount} pg
                </span>
              ) : null}
            </div>
          )}

          {hasDocument ? (
            <div
              className={cn(
                "border-base-300 rounded-box relative flex min-h-0 flex-1 flex-col overflow-hidden border-2 border-dashed",
                isFunctional && isDragOver && "border-primary bg-primary/5",
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <PdfDocumentPreview url={blobPreviewURL} pages={previewPages} />
              {processingOverlay}
            </div>
          ) : (
            <>
              {isScan ? (
                <div
                  className={cn(
                    "border-base-300 bg-base-200/50 rounded-box relative min-h-0 flex-1 overflow-hidden border-2 border-dashed",
                  )}
                >
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center">
                    {isFileProcessing ? (
                      <>
                        <span className="loading loading-spinner loading-lg text-primary" />
                        <p className="text-base-content/50 text-sm">
                          {loadingLabel}
                        </p>
                      </>
                    ) : (
                      <>
                        <span className="icon-[material-symbols--adf-scanner-rounded] text-base-content/20 text-6xl" />
                        <div>
                          <p className="font-medium">No scan yet</p>
                          <p className="text-base-content/50 mt-1 text-sm">
                            Configure settings and start scanning — preview will
                            appear here
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <label
                  className={cn(
                    "border-base-300 rounded-box relative min-h-0 flex-1 cursor-pointer overflow-hidden border-2 border-dashed transition-colors",
                    isFunctional && isDragOver && "border-primary bg-primary/5",
                  )}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center">
                    {isFileProcessing ? (
                      <>
                        <span className="loading loading-spinner loading-lg text-primary" />
                        <p className="text-base-content/50 text-sm">
                          {loadingLabel}
                        </p>
                      </>
                    ) : (
                      <>
                        <span className="icon-[material-symbols--cloud-upload-rounded] text-base-content/25 text-6xl" />
                        <div>
                          <p className="font-medium">Drop your file here</p>
                          <p className="text-base-content/50 mt-1 text-sm">
                            or click to browse
                          </p>
                        </div>
                        {isFunctional && (
                          <span className="btn btn-primary btn-wide mt-1">
                            Choose file
                          </span>
                        )}
                        <p className="text-base-content/40 mt-2 max-w-xs text-xs">
                          PDF, Word, Excel, images, and more · max 20 MB
                        </p>
                      </>
                    )}
                  </div>
                  {fileInput}
                </label>
              )}
            </>
          )}

          {hasDocument && isFunctional && (
            <button
              type="button"
              className="btn btn-primary btn-sm w-full self-center"
              disabled={isFileProcessing}
              onClick={() => inputRef.current?.click()}
            >
              Replace file
            </button>
          )}

          {hasDocument && isFunctional && fileInput}

          {hasDocument && !isFunctional && blobPreviewURL && (
            <a
              href={blobPreviewURL}
              download={fileLabel ?? downloadFileName}
              className="btn btn-outline btn-sm self-start"
            >
              <span className="icon-[material-symbols--download-rounded]" />
              Download PDF
            </a>
          )}
        </div>

        <Modal
          open={!!alert}
          onOpenChange={() => setAlert(undefined)}
          title="Warning"
        >
          {alert}
        </Modal>
      </>
    );
  }

  return (
    <>
      <div
        className={cn(
          "border-base-300 bg-base-200 rounded-box relative flex min-h-64 flex-col overflow-hidden border-2 border-dashed transition-colors",
          isFunctional && isDragOver && "border-primary bg-primary/5",
          blobPreviewURL ? "min-h-96" : "items-center justify-center p-6",
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isFileProcessing ? (
          <span className="loading loading-spinner loading-lg text-primary m-auto" />
        ) : blobPreviewURL ? (
          <PdfDocumentPreview url={blobPreviewURL} pages={previewPages} />
        ) : (
          <>
            <span className="icon-[material-symbols--docs-rounded] text-base-content/30 mb-3 text-5xl" />
            <p className="text-base-content/50 text-center text-sm">
              {isFunctional ? label : "Preview will appear here"}
            </p>
          </>
        )}
      </div>

      {isFunctional && (
        <label className="btn btn-outline mt-4 w-full">
          Attach file
          {fileInput}
        </label>
      )}

      {!isFunctional && blobPreviewURL && (
        <a
          href={blobPreviewURL}
          download={downloadFileName}
          className="btn btn-outline mt-4 w-full"
        >
          <span className="icon-[material-symbols--download-rounded]" />
          Download result
        </a>
      )}

      <Modal
        open={!!alert}
        onOpenChange={() => setAlert(undefined)}
        title="Warning"
      >
        {alert}
      </Modal>
    </>
  );
}
