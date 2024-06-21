import dynamic from "next/dynamic";
import React, { useState } from "react";
import {
  MoodleSource,
  ResponseData,
  TelegramSource,
} from "@/hooks/sendSearchRequest";
import Markdown from "react-markdown";
import SearchSource from "./SearchSource";

export const PdfPreview = dynamic(
  () => import("./pdfpreview").then((x) => x.default),
  { ssr: false },
);

const markdown_test = "<div>test</div>";

const SearchResult: React.FC<{
  response_data: ResponseData;
}> = ({ response_data }) => {
  const [selectedSource, setSelectedSource] = useState(0);

  return (
    <>
      {response_data.responses?.map((response, index_response) => (
        <div
          key={index_response}
          className="m-4 grid auto-rows-max grid-cols-10 gap-4 rounded-2xl bg-primary-main @xl/content:grid-cols-2"
        >
          <div className="group col-span-4 flex flex-col gap-2 rounded-2xl px-4 py-6">
            <p className="mb-4 text-2xl font-bold">Answer Title</p>
            <Markdown>{response.markdown_text}</Markdown>
            {response.sources.length != 0 && (
              <div className="sources">
                <p style={{ fontWeight: "bold" }}>Sources:</p>
                {response.sources.map((source, index_source) => {
                  if (source.type === "moodle") {
                    return (
                      <SearchSource
                        key={index_source}
                        isSelected={selectedSource === index_source}
                        source={source.course_name}
                        onSelect={() => setSelectedSource(index_source)}
                        link={source.resource_download_url}
                      ></SearchSource>
                    );
                  }
                  if (source.type === "telegram") {
                    return (
                      <SearchSource
                        key={index_source}
                        isSelected={selectedSource === index_source}
                        source={source.chat_title}
                        onSelect={() => setSelectedSource(index_source)}
                        link={source.link}
                      ></SearchSource>
                    );
                  }
                  console.log(response.sources[selectedSource]);
                  return null; // добавить для безопасного возврата null, если не удовлетворяет условиям
                })}
              </div>
            )}
          </div>

          {response.sources.length != 0 &&
          response.sources[selectedSource].type === "moodle" ? (
            <PdfPreview
              key={`pdf-preview-${index_response}`}
              file={
                (response.sources[selectedSource] as MoodleSource)
                  .resource_preview_url
              }
              fileTitle={
                (response.sources[selectedSource] as MoodleSource).display_name
              }
              searchText={response_data.search_text}
            ></PdfPreview>
          ) : (
            response.sources.length != 0 &&
            response.sources[selectedSource].type === "telegram" && (
              <div className="col-span-6 flex w-full flex-col items-center justify-center gap-4">
                <p>No preview available</p>
                <a
                  href={
                    (response.sources[selectedSource] as TelegramSource).link
                  }
                  className="bg-primary-hover/75 p-4 hover:bg-primary-hover"
                >
                  Go to the source
                </a>
              </div>
            )
          )}
        </div>
      ))}
    </>
  );
};

export default SearchResult;
