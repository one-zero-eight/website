import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Document, Page, pdfjs } from "react-pdf";
import PdfJsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker";

// Vite serves the worker via a blob URL, avoiding broken .mjs MIME on prod
// (Angie/nginx often returns application/octet-stream for *.mjs).
if (!pdfjs.GlobalWorkerOptions.workerPort) {
  pdfjs.GlobalWorkerOptions.workerPort = new PdfJsWorker();
}

export function PdfDocumentPreview({
  url,
  pages,
  toolbarHost,
  openOnLastPage = false,
}: {
  url: string;
  pages?: number[];
  toolbarHost?: HTMLElement | null;
  openOnLastPage?: boolean;
}) {
  const [viewerEl, setViewerEl] = useState<HTMLDivElement | null>(null);
  const [viewerWidth, setViewerWidth] = useState(0);
  const [numPages, setNumPages] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pageInput, setPageInput] = useState("1");

  useEffect(() => {
    if (!viewerEl) return;

    function updateWidth() {
      if (!viewerEl) return;
      setViewerWidth(viewerEl.clientWidth);
    }

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(viewerEl);
    return () => observer.disconnect();
  }, [viewerEl]);

  const pagesToShow = useMemo(() => {
    if (!numPages) return [];
    if (pages?.length) {
      return pages.filter((page) => page >= 1 && page <= numPages);
    }
    return Array.from({ length: numPages }, (_, index) => index + 1);
  }, [numPages, pages]);

  useEffect(() => {
    if (!pagesToShow.length) {
      setCurrentIndex(0);
      return;
    }
    setCurrentIndex(openOnLastPage ? pagesToShow.length - 1 : 0);
  }, [url, pages, pagesToShow.length, openOnLastPage]);

  const isFiltered =
    pages !== undefined &&
    numPages > 0 &&
    pagesToShow.length > 0 &&
    pagesToShow.length < numPages;

  const currentDocumentPage = pagesToShow[currentIndex] ?? 1;
  const previewPageNumber = isFiltered ? currentIndex + 1 : currentDocumentPage;
  const previewTotal = isFiltered ? pagesToShow.length : numPages;

  const pageWidth =
    viewerWidth > 0 ? Math.min(viewerWidth - 32, 480) : undefined;

  useEffect(() => {
    setPageInput(String(previewPageNumber));
  }, [previewPageNumber]);

  function goToDocumentPage(page: number) {
    const index = pagesToShow.indexOf(page);
    if (index >= 0) setCurrentIndex(index);
  }

  function handlePageInputCommit() {
    const page = parseInt(pageInput);
    if (!page) {
      setPageInput(String(previewPageNumber));
      return;
    }

    if (isFiltered) {
      if (page < 1 || page > pagesToShow.length) {
        setPageInput(String(previewPageNumber));
        return;
      }
      setCurrentIndex(page - 1);
      return;
    }

    if (!pagesToShow.includes(page)) {
      setPageInput(String(previewPageNumber));
      return;
    }
    goToDocumentPage(page);
  }

  function handlePrevPage() {
    setCurrentIndex((index) => Math.max(0, index - 1));
  }

  function handleNextPage() {
    setCurrentIndex((index) => Math.min(pagesToShow.length - 1, index + 1));
  }

  const toolbar = (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        className="btn btn-ghost btn-sm btn-square"
        disabled={currentIndex <= 0 || !pagesToShow.length}
        onClick={handlePrevPage}
      >
        <span className="icon-[material-symbols--chevron-left-rounded] text-lg" />
      </button>

      <div className="flex items-center gap-1.5">
        <span className="text-base-content/70 text-sm">Page</span>
        <input
          type="number"
          className="input input-bordered input-sm w-14 [appearance:textfield] text-center tabular-nums [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          min={1}
          max={previewTotal || 1}
          value={pageInput}
          disabled={!pagesToShow.length}
          onChange={(event) => setPageInput(event.target.value)}
          onBlur={handlePageInputCommit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
        />
        <span className="text-base-content/50 text-sm tabular-nums">
          / {previewTotal || "—"}
        </span>
        {isFiltered ? (
          <span className="text-base-content/40 text-xs">
            (p. {currentDocumentPage} in file)
          </span>
        ) : null}
      </div>

      <button
        type="button"
        className="btn btn-ghost btn-sm btn-square"
        disabled={currentIndex >= pagesToShow.length - 1 || !pagesToShow.length}
        onClick={handleNextPage}
      >
        <span className="icon-[material-symbols--chevron-right-rounded] text-lg" />
      </button>
    </div>
  );

  return (
    <div className="flex w-full flex-col">
      {toolbarHost ? (
        createPortal(toolbar, toolbarHost)
      ) : (
        <div className="border-base-300 bg-base-100 flex shrink-0 items-center justify-center gap-2 border-b px-3 py-2">
          {toolbar}
        </div>
      )}

      <div
        ref={setViewerEl}
        className="flex w-full items-start justify-center p-4"
      >
        <Document
          file={url}
          onLoadSuccess={({ numPages: loadedPages }) =>
            setNumPages(loadedPages)
          }
          loading={
            <div className="flex min-h-48 w-full items-center justify-center">
              <span className="loading loading-spinner loading-lg text-primary" />
            </div>
          }
          error={
            <div className="text-base-content/50 flex min-h-48 w-full items-center justify-center text-sm">
              Could not load preview
            </div>
          }
        >
          {pagesToShow.length > 0 && pageWidth ? (
            <div className="rounded-box bg-base-100 shadow-sm">
              <Page
                key={`${url}-${currentDocumentPage}`}
                pageNumber={currentDocumentPage}
                width={pageWidth}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                loading={
                  <div
                    className="skeleton rounded-box"
                    style={{ width: pageWidth, height: pageWidth * 1.294 }}
                  />
                }
              />
            </div>
          ) : null}
        </Document>
      </div>
    </div>
  );
}
