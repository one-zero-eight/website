import {
  MoodleSource,
  SearchResponseSource,
} from "@/lib/search/api/__generated__";
import type { PDFDocumentProxy } from "pdfjs-dist";
import React, { useCallback, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/TextLayer.css";

function highlightPattern(text: string, pattern: string) {
  return text.replace(pattern, (value: any) => `<mark>${value}</mark>`);
}

export declare type PdfPreviewProps = {
  source: SearchResponseSource | null;
  searchText: string;
};

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export default function PdfPreview({ source, searchText }: PdfPreviewProps) {
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const PAGE_MAX_HEIGHT = 400;
  const [error, setError] = useState<string | null>(null);

  let pageIndex: number = 1;
  if ((source as MoodleSource).preview_location) {
    pageIndex = (source as MoodleSource).preview_location?.page_index ?? 1;
  }
  const [currentPage, setCurrentPage] = useState(pageIndex);

  function onDocumentLoadSuccess(pdf: PDFDocumentProxy) {
    setPdfDocument(pdf);
    setNumPages(pdf.numPages);
    setCurrentPage(1); // Устанавливаем текущую страницу на первую при загрузке документа
  }

  function onDocumentLoadError(error: any) {
    if (error.name === "MissingPDFException") {
      setError("PDF file is missing");
    } else {
      setError("Error while loading PDF file");
    }
  }

  const textRenderer = useCallback(
    (textItem: { str: any }) => highlightPattern(textItem.str, searchText),
    [searchText],
  );

  const goToPrevPage = () => {
    setCurrentPage((prevPage) => (prevPage > 1 ? prevPage - 1 : prevPage));
  };

  const goToNextPage = () => {
    setCurrentPage((prevPage) =>
      prevPage < numPages ? prevPage + 1 : prevPage,
    );
  };

  return (
    <div className="col-span-6 m-4 flex h-[849px] w-[50%] flex-col items-center justify-center rounded-2xl border border-default p-4">
      <div className="mb-4 flex w-full flex-col items-start justify-center py-2 text-2xl font-bold">
        <p>{(source as MoodleSource).display_name}</p>
        <p className="text-[18px] font-normal text-breadcrumbs">
          {(source as MoodleSource).breadcrumbs.join(" > ")}
        </p>
      </div>
      {error ? (
        <div className="text-2xl font-bold text-red-500">{error}</div>
      ) : (
        <Document
          className="max-w-full rounded-2xl"
          file={(source as MoodleSource).link}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={
            <div
              className="flex animate-pulse bg-primary-hover"
              style={{
                height: `${PAGE_MAX_HEIGHT}px`,
              }}
            />
          }
        >
          <div
            style={{
              maxHeight: `${PAGE_MAX_HEIGHT}px`,
              overflowY: "scroll",
            }}
            className="custom-preview-scrollbar max-w-full"
          >
            <Page pageNumber={currentPage} customTextRenderer={textRenderer} />
          </div>
        </Document>
      )}
      {error && (
        <div className="mb-2 mt-6 flex flex-row gap-12">
          <div className="flex flex-row items-center justify-center rounded-2xl bg-primary-tgresult p-4">
            <a
              className="flex flex-row items-center justify-center gap-4"
              href={(source as MoodleSource).resource_download_url}
            >
              <span
                className="icon-[material-symbols--download]"
                style={{ width: "1.3rem", height: "1.3rem" }}
              ></span>
              Download
            </a>
          </div>

          <div className="flex flex-row items-center gap-12 rounded-2xl bg-primary-tgresult p-4">
            <button onClick={goToPrevPage} disabled={currentPage <= 1}>
              &lt;
            </button>
            <span>{`${currentPage}/${numPages}`}</span>
            <button onClick={goToNextPage} disabled={currentPage >= numPages}>
              &gt;
            </button>
          </div>

          <div className="flex flex-row items-center justify-center rounded-2xl bg-primary-tgresult p-4">
            <a
              className="flex flex-row items-center justify-center gap-4"
              href={(source as MoodleSource).resource_preview_url}
            >
              <span
                className="icon-[material-symbols--open-in-new]"
                style={{ width: "1.3rem", height: "1.3rem" }}
              ></span>
              To source
            </a>
          </div>

          <div className="flex flex-row items-center justify-center rounded-2xl bg-primary-tgresult p-4">
            <a
              className="flex flex-row items-center justify-center gap-4"
              href=""
            >
              <span
                className="icon-[material-symbols--open-in-new]"
                style={{ width: "1.3rem", height: "1.3rem" }}
              ></span>
              New tab
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
