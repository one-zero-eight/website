import { useCallback, useState } from "react";
import React from "react";
import { pdfjs, Document, Page } from "react-pdf";

import type { PDFDocumentProxy } from "pdfjs-dist";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const options = {
  cMapUrl: "/cmaps/",
  standardFontDataUrl: "/standard_fonts/",
};

const maxWidth = 600;
const maxHeight = 300;

export default function SearchResult() {
  const file =
    "https://ontheline.trincoll.edu/images/bookdown/sample-local-pdf.pdf";
  const [numPages, setNumPages] = useState<number>();
  const [containerRef, setContainerRef] = useState<HTMLElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>();

  function onDocumentLoadSuccess({
    numPages: nextNumPages,
  }: PDFDocumentProxy): void {
    setNumPages(nextNumPages);
  }

  return (
    <div className="m-4 grid grid-cols-10 gap-4 @xl/content:grid-cols-2">
      <div className="col-span-4 flex flex-col gap-4">
        <a
          href={file}
          className="group flex flex-row gap-4 rounded-2xl bg-primary-main px-4 py-6 hover:bg-secondary-main"
        >
          <div className="w-12">
            <span className="icon-[material-symbols--quick-reference-outline-rounded] text-5xl text-[#9747FF]" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-2xl font-semibold text-text-main">
              Example Document
            </p>
            <p className="text-lg text-text-secondary/75">
              This is a simple PDF file. Fun fun fun.
            </p>
          </div>
        </a>
      </div>
      <div className="col-span-6 flex flex-row items-center justify-center rounded-2xl bg-primary-main p-4">
        <Document
          file={file}
          onLoadSuccess={onDocumentLoadSuccess}
          options={options}
        >
          {Array.from(new Array(numPages), (el, index) => (
            <Page
              key={`page_${index + 1}`}
              pageNumber={index + 1}
              width={
                containerWidth ? Math.min(containerWidth, maxWidth) : maxWidth
              }
            />
          ))}
        </Document>
      </div>
    </div>
  );
}
