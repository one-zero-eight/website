import dynamic from "next/dynamic";
import React from "react";
import { ResponseData } from "@/hooks/sendSearchRequest";

export const PdfPreview = dynamic(
  () => import("./pdfpreview").then((x) => x.default),
  { ssr: false },
);

const markdown_test = "<div>test</div>";

const SearchResult: React.FC<{
  response_data: ResponseData;
}> = ({ response_data }) => {
  return (
    <>
      {response_data.responses?.map((response, index_response) => (
        <div
          key={index_response}
          className="m-4 grid auto-rows-max grid-cols-10 gap-4 rounded-2xl bg-primary-main @xl/content:grid-cols-2"
        >
          <div className="group col-span-4 flex flex-col gap-2 rounded-2xl px-4 py-6">
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
              Markdown place
              {/* {response.markdown_text} */}
            </p>

            <div className="sources">
              <p style={{ fontWeight: "bold" }}>Sources:</p>
              {response.sources.map((source, index_source) => {
                if (source.type === "moodle") {
                  return (
                    <div key={index_source} className="moodle-response">
                      <a
                        href={source.resource_download_url}
                        className="hover:bg-secondary-main"
                      >
                        {source.course_name}
                      </a>
                      <a>{">"}</a>
                    </div>
                  );
                }
                if (source.type === "telegram") {
                  return (
                    <a
                      key={index_source}
                      href={source.link}
                      className="hover:bg-secondary-main"
                    >
                      {source.chat_title}
                    </a>
                  );
                }
                return null; // добавить для безопасного возврата null, если не удовлетворяет условиям
              })}
            </div>
          </div>

          {response.sources[0].type === "moodle" && (
            <PdfPreview
              key={`pdf-preview-${index_response}`}
              file={response.sources[0].resource_preview_url}
              searchText={response_data.search_text}
            ></PdfPreview>
          )}
        </div>
      ))}
    </>
  );
};

export default SearchResult;
