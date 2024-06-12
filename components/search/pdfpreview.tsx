import React, { useEffect, useRef, useState } from "react";
import { pdfjs, Document, Page } from "react-pdf";
import type { PDFDocumentProxy } from "pdfjs-dist";

export declare type PdfPreviewProps = {
  file: string;
  clipX: number;
  clipY: number;
  description: string;
};

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const options = {
  cMapUrl: "/cmaps/",
  standardFontDataUrl: "/standard_fonts/",
};

const previewWidth = 300; // Ширина предпросмотра
const previewHeight = 150; // Высота предпросмотра

const PdfPreview: React.FC<{
  file: string;
  clipX: number;
  clipY: number;
  description: string;
}> = ({ file, clipX, clipY, description }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);

  const onDocumentLoadSuccess = (pdf: PDFDocumentProxy): void => {
    setPdfDocument(pdf);
  };

  useEffect(() => {
    if (pdfDocument) {
      const renderPage = async () => {
        const page = await pdfDocument.getPage(1);
        const viewport = page.getViewport({ scale: 1 });
        const canvas = canvasRef.current;
        const context = canvas!.getContext("2d");

        canvas!.width = viewport.width; // Заменить на previewWidth если нужно уменьшить размер
        canvas!.height = previewHeight;

        const renderContext = {
          canvasContext: context!,
          viewport,
          transform: [1, 0, 0, 1, -clipX, -clipY], // Обрезаем нужную часть
        };

        await page.render(renderContext).promise;
      };

      renderPage();
    }
  }, [pdfDocument]);

  return (
    <div
      className="pdf-preview-elem col-span-7 rounded-2xl bg-primary-main" // col-span-4, если используете previewWidth
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        padding: "10px",
      }}
    >
      <Document
        file={file}
        onLoadSuccess={onDocumentLoadSuccess}
        options={options}
      >
        <canvas ref={canvasRef} className="rounded-2xl" />
      </Document>
      <div
        className="pdf-preview-info text-lg text-text-secondary/75"
        style={{
          width: `${previewWidth}px`,
          height: "30px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginTop: "10px",
        }}
      >
        <p>{description}</p>
      </div>
    </div>
  );
};

export default PdfPreview;
