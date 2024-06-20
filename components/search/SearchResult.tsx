import dynamic from "next/dynamic";
import React from "react";

export const PdfPreview = dynamic(
  () => import("./pdfpreview").then((x) => x.default),
  { ssr: false },
);

const markdown_test = "<div>test</div>";

const SearchResult: React.FC<{
  file: string;
  searchText: string;
}> = ({ file, searchText }) => {
  return (
    <div className="m-4 grid auto-rows-max grid-cols-10 gap-4 rounded-2xl bg-primary-main @xl/content:grid-cols-2">
      <div className="group col-span-4 flex flex-col gap-2 rounded-2xl px-4 py-6 hover:bg-secondary-main">
        <p
          style={{
            fontSize: "1.5rem",
            fontWeight: "bold",

            marginBottom: "1rem",
          }}
        >
          Answer Title
        </p>

        <p className="overflow-hidden text-ellipsis text-2xl font-semibold text-text-main">
          {file}
        </p>
        <p className="text-lg text-text-secondary/75">
          This is a simple PDF file. Fun fun fun.
        </p>
      </div>

      <PdfPreview file={file} searchText={searchText}></PdfPreview>
    </div>
  );
};

export default SearchResult;
