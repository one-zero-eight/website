import React, { useEffect, useRef, useState, useCallback } from "react";
import { pdfjs, Document, Page } from "react-pdf";
import type { PDFDocumentProxy } from "pdfjs-dist";
import "react-pdf/dist/esm/Page/TextLayer.css";

function highlightPattern(text: string, pattern: string) {
  return text.replace(pattern, (value: any) => `<mark>${value}</mark>`);
}

export declare type PdfPreviewProps = {
  file: string;
  searchText: string;
};

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const options = {
  cMapUrl: "/cmaps/",
  standardFontDataUrl: "/standard_fonts/",
};

const PdfPreview: React.FC<PdfPreviewProps> = ({ file, searchText }) => {
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_MAX_HEIGHT = 400;

  function onDocumentLoadSuccess(pdf: PDFDocumentProxy) {
    setPdfDocument(pdf);
    setNumPages(pdf.numPages);
    setCurrentPage(1); // Устанавливаем текущую страницу на первую при загрузке документа
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
    <div
      className="pdf-preview-elem col-span-6 rounded-2xl bg-primary-main"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        padding: "10px",
      }}
    >
      <Document
        className="rounded-2xl"
        file={file}
        onLoadSuccess={onDocumentLoadSuccess}
      >
        <div
          style={{
            maxHeight: `${PAGE_MAX_HEIGHT}px`,
            overflowY: "scroll",
          }}
          className="pdf-preview-elem2"
        >
          <Page pageNumber={currentPage} customTextRenderer={textRenderer} />
        </div>
      </Document>
      <div className="navigation">
        <button onClick={goToPrevPage} disabled={currentPage <= 1}>
          &lt;{"      "}
        </button>
        <span>{`${currentPage}/${numPages}`}</span>
        <button onClick={goToNextPage} disabled={currentPage >= numPages}>
          {"      "}&gt;
        </button>
      </div>
    </div>
  );
};

export default PdfPreview; // example.pdf
