import { searchTypes } from "@/api/search";
import { usePreviewFile } from "@/api/search/use-preview-file.ts";
import { useElementHeight, useElementWidth } from "@/lib/ui/use-element-size";
import type { PDFDocumentProxy } from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker?worker&url";
import { useCallback, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import PreviewBottomButton from "./PreviewBottomButton";

import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

function highlightPattern(text: string, pattern: string) {
  return text.replace(pattern, (value: any) => `<mark>${value}</mark>`);
}

export declare type PdfPreviewProps = {
  source: searchTypes.SchemaMoodleFileSourceOutput;
  searchText: string;
};

export default function PdfPreview({ source, searchText }: PdfPreviewProps) {
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const { data: file } = usePreviewFile(
    source.resource_preview_url ?? undefined,
  );

  const divRef = useRef<HTMLDivElement>(null);
  const divWidth = useElementWidth(divRef);
  const divHeight = useElementHeight(divRef);

  const numPages = pdfDocument?.numPages ?? 0;

  function onDocumentLoadSuccess(pdf: PDFDocumentProxy) {
    setPdfDocument(pdf);

    const pageIndex = source.preview_location?.page_index ?? 1;
    setCurrentPage(pageIndex);
  }

  function onDocumentLoadError(error: any) {
    if (error.name === "MissingPDFException") {
      setError("PDF file is missing");
    } else if (error.name === "InvalidPDFException") {
      setError("Preview available for PDF only");
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
    <>
      <Document
        inputRef={divRef}
        file={file?.data}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={onDocumentLoadError}
        noData={
          <div className="flex h-[400px] items-center justify-center text-sm dark:text-[#eeff41]">
            File has not yet been uploaded
          </div>
        }
        loading={<div className="skeleton flex h-[400px]" />}
        error={
          <div className="flex h-[400px] items-center justify-center text-sm dark:text-[#eeff41]">
            {error}
          </div>
        }
      >
        {pdfDocument !== null && (
          <div className="flex items-center justify-center">
            <div className="rounded-box overflow-hidden shadow-lg">
              <Page
                noData={
                  <div
                    className="skeleton flex"
                    style={{ height: divHeight }}
                  />
                }
                loading={
                  <div
                    className="skeleton flex"
                    style={{ height: divHeight }}
                  />
                }
                error={<div className="skeleton flex h-[400px]" />}
                width={divWidth}
                pageNumber={currentPage}
                customTextRenderer={textRenderer}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                renderForms={false}
              />
            </div>
          </div>
        )}
      </Document>

      <div className="mt-2 mb-4 flex flex-wrap justify-center gap-4 gap-y-4 md:flex-row">
        {file !== undefined && (
          <div className="flex flex-row items-stretch gap-4">
            <PreviewBottomButton
              icon={<span className="icon-[material-symbols--download]"></span>}
              text="Download"
              href={source.resource_download_url ?? undefined}
              target="_blank"
              download
            />

            {error === null && (
              <div className="bg-base-100 dark:bg-inh-primary-hover rounded-field flex flex-row items-center">
                <button
                  className="px-4"
                  onClick={goToPrevPage}
                  disabled={currentPage <= 1}
                >
                  &lt;
                </button>
                <div className="max-w-4"></div>
                <span className="text-sm md:text-xs">{`${currentPage}/${numPages}`}</span>
                <div className="max-w-4"></div>
                <button
                  className="px-4"
                  onClick={goToNextPage}
                  disabled={currentPage >= numPages}
                >
                  &gt;
                </button>
              </div>
            )}
          </div>
        )}
        <div className="flex flex-row items-stretch gap-4">
          <PreviewBottomButton
            icon={<span className="icon-[material-symbols--open-in-new]" />}
            text="To source"
            href={source.link}
            target="_blank"
          />
          {file !== undefined && (
            <PreviewBottomButton
              icon={<span className="icon-[material-symbols--open-in-new]" />}
              text="New tab"
              href={source.resource_download_url ?? undefined}
              target="_blank"
            />
          )}
        </div>
      </div>
    </>
  );
}
