import type { PDFDocumentProxy } from "pdfjs-dist";
import React, { useCallback, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/TextLayer.css";

function highlightPattern(text: string, pattern: string) {
  return text.replace(pattern, (value: any) => `<mark>${value}</mark>`);
}

export declare type PdfPreviewProps = {
  file: string;
  fileTitle: string;
  searchText: string;
};

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export default function PdfPreview({
  file,
  fileTitle,
  searchText,
}: PdfPreviewProps) {
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_MAX_HEIGHT = 400;
  const [error, setError] = useState<string | null>(null);

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
    <div className="col-span-6 flex h-[849px] w-[50%] flex-col items-center justify-center p-[10px]">
      <div className="mb-4 flex w-full items-start justify-center py-2 text-2xl font-bold">
        <p>{fileTitle}</p>
      </div>
      {error ? (
        <div className="text-2xl font-bold text-red-500">{error}</div>
      ) : (
        <Document
          className="max-w-full rounded-2xl"
          file={file}
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
      {!error && (
        <div
          className="navigation"
          style={{
            marginTop: "1.5rem",
            marginBottom: "0.5rem",
          }}
        >
          <button onClick={goToPrevPage} disabled={currentPage <= 1}>
            &lt;
          </button>
          <span>{`${currentPage}/${numPages}`}</span>
          <button onClick={goToNextPage} disabled={currentPage >= numPages}>
            &gt;
          </button>
        </div>
      )}
    </div>
  );
}
