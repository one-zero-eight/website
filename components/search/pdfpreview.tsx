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

const PdfPreview: React.FC<{
  file: string;
  searchText: string;
}> = ({ file, searchText }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [allPageNumbers, setAllPageNumbers] = React.useState<number[]>();
  const PAGE_MAX_HEIGHT = 200;

  function onDocumentLoadSuccess(pdf: PDFDocumentProxy) {
    setPdfDocument(pdf);
    const allPageNumbers: number[] = [];
    for (let p = 1; p < pdf.numPages + 1; p++) {
      allPageNumbers.push(p);
    }
    setAllPageNumbers(allPageNumbers);
  }

  const textRenderer = useCallback(
    (textItem: { str: any }) => highlightPattern(textItem.str, searchText),
    [searchText],
  );

  return (
    <div
      className="pdf-preview-elem col-span-6 rounded-2xl bg-primary-main" // col-span-4, если используете previewWidth
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
            overflowX: "hidden",
          }}
        >
          {allPageNumbers
            ? allPageNumbers.map((pn) => (
                <Page
                  key={`page-${pn}`}
                  pageNumber={pn}
                  customTextRenderer={textRenderer}
                />
              ))
            : undefined}
        </div>
      </Document>
    </div>
  );
};

export default PdfPreview;
