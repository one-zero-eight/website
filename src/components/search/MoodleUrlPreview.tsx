import { search } from "@/lib/search";
import PreviewBottomButton from "./PreviewBottomButton";

export declare type MoodleUrlPreviewProps = {
  source: search.MoodleUrlSource;
};

export default function MoodleUrlPreview({ source }: MoodleUrlPreviewProps) {
  return (
    <>
      <div className="flex h-[400px] w-full items-center justify-center overflow-hidden rounded-2xl shadow-lg">
        <a
          href={source.url}
          className="flex flex-row items-center justify-center gap-2 hover:text-secondary-hover"
        >
          <p>Go To</p>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="size-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
            />
          </svg>
        </a>
      </div>

      <div className="mb-4 mt-2 flex flex-wrap justify-center gap-4 gap-y-4 md:flex-row">
        <PreviewBottomButton
          icon={<span className="icon-[material-symbols--open-in-new]" />}
          text="To source"
          href={source.link}
          target="_blank"
        />
      </div>
    </>
  );
}
