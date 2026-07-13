import { Modal } from "@/components/common/Modal.tsx";
import { PdfDocumentPreview } from "@/components/web-print/PdfDocumentPreview.tsx";
import { cn } from "@/lib/ui/cn";
import {
  useCallback,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".xls",
  ".docx",
  ".xlsx",
  ".png",
  ".txt",
  ".md",
  ".jpg",
  ".jpeg",
  ".bmp",
  ".odt",
  ".ods",
] as const;

const ACCEPTABLE_FILE_EXTENSIONS = ALLOWED_EXTENSIONS.join(",");

function getFileExtension(filename: string) {
  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex < 0) return "";
  return filename.slice(dotIndex).toLowerCase();
}

function isAllowedExtension(filename: string) {
  const ext = getFileExtension(filename);
  return (ALLOWED_EXTENSIONS as readonly string[]).includes(ext);
}

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

  if (!isAllowedExtension(file.name)) {
    return (
      <>
        <p>Such file is not supported!</p>
        <div className="mt-2 grid grid-cols-3 gap-1 text-sm">
          {ALLOWED_EXTENSIONS.map((ext) => (
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

export { formatFileSize };

export function FileDropzone({
  fileProcess,
  isFileProcessing,
  blobPreviewURL,
  downloadFileName,
  isFunctional,
  label = "Drag & drop a file here",
  variant = "default",
  previewPages,
  loadingLabel = "Processing…",
  loadingProgress,
  filePickerRef,
  previewToolbarHost,
}: {
  fileProcess: (file: File) => void;
  isFileProcessing: boolean;
  blobPreviewURL: string | undefined;
  downloadFileName: string | undefined;
  isFunctional: boolean;
  label?: string;
  variant?: "default" | "print" | "scan";
  previewPages?: number[];
  loadingLabel?: string;
  loadingProgress?: number;
  filePickerRef?: RefObject<HTMLInputElement | null>;
  previewToolbarHost?: HTMLElement | null;
}) {
  const [alert, setAlert] = useState<ReactNode>();
  const [isDragOver, setIsDragOver] = useState(false);
  const localInputRef = useRef<HTMLInputElement>(null);
  const inputRef = filePickerRef ?? localInputRef;

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

    const showProgress = loadingProgress != null;
    const progressValue = Math.round(loadingProgress ?? 0);

    const processingContent = (
      <div className="flex w-full max-w-xs flex-col items-center gap-3 px-4">
        <span className="loading loading-spinner loading-lg text-primary" />
        <p className="text-base-content/50 text-sm">
          {showProgress ? `${loadingLabel} ${progressValue}%` : loadingLabel}
        </p>
        {showProgress && (
          <progress
            className="progress progress-primary w-full"
            value={progressValue}
            max={100}
          />
        )}
      </div>
    );

    const processingOverlay = isFileProcessing && (
      <div className="bg-base-100 absolute inset-0 flex flex-col items-center justify-center gap-2">
        {processingContent}
      </div>
    );

    return (
      <>
        <div
          className={cn(
            "flex w-full flex-col gap-3",
            !hasDocument && "min-h-80",
          )}
        >
          {hasDocument ? (
            <div
              className={cn(
                "relative w-full overflow-hidden",
                isFunctional && isDragOver && "bg-primary/5 rounded-box",
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <PdfDocumentPreview
                url={blobPreviewURL}
                pages={previewPages}
                toolbarHost={previewToolbarHost}
                openOnLastPage={isScan}
              />
              {processingOverlay}
            </div>
          ) : (
            <>
              {isScan ? (
                <div className="border-base-300 bg-base-200/50 rounded-box grid min-h-80 place-items-center border-2 border-dashed p-8 text-center">
                  {isFileProcessing ? (
                    processingContent
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <span className="icon-[material-symbols--adf-scanner-rounded] text-base-content/20 text-6xl" />
                      <div>
                        <p className="font-medium">No scan yet</p>
                        <p className="text-base-content/50 mt-1 text-sm">
                          Configure settings and start scanning — preview will
                          appear here
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <label
                  className={cn(
                    "border-base-300 rounded-box relative flex min-h-80 cursor-pointer flex-col items-center justify-center overflow-hidden border-2 border-dashed p-8 text-center transition-colors",
                    isFunctional && isDragOver && "border-primary bg-primary/5",
                  )}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {isFileProcessing ? (
                    <div className="flex flex-col items-center gap-3">
                      <span className="loading loading-spinner loading-lg text-primary" />
                      <p className="text-base-content/50 text-sm">
                        {loadingLabel}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
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
                    </div>
                  )}
                  {fileInput}
                </label>
              )}
            </>
          )}

          {hasDocument && isFunctional && fileInput}
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
