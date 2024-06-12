import React from "react";
import PdfPreview from "./pdfpreview";

const SearchResult: React.FC<{
  file: string;
  clipX: number;
  clipY: number;
  description: string;
}> = ({ file, clipX, clipY, description }) => {
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

      <PdfPreview
        file={file}
        clipX={clipX}
        clipY={clipY}
        description={description}
      ></PdfPreview>
    </div>
  );
};

export default SearchResult;
