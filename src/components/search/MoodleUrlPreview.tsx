import { searchTypes } from "@/api/search";
import { Trans, useLingui } from "@lingui/react/macro";
import PreviewBottomButton from "./PreviewBottomButton";

export declare type MoodleUrlPreviewProps = {
  source: searchTypes.SchemaMoodleUrlSource;
};

export default function MoodleUrlPreview({ source }: MoodleUrlPreviewProps) {
  const { t } = useLingui();
  return (
    <>
      <div className="rounded-box flex h-[400px] w-full items-center justify-center overflow-hidden shadow-lg">
        <a
          href={source.url}
          className="hover:text-base-300 flex flex-row items-center justify-center gap-2"
        >
          <p>
            <Trans>Go To</Trans>
          </p>
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

      <div className="mt-2 mb-4 flex flex-wrap justify-center gap-4 gap-y-4 md:flex-row">
        <PreviewBottomButton
          icon={<span className="icon-[material-symbols--open-in-new]" />}
          text={t`To source`}
          href={source.link}
          target="_blank"
        />
      </div>
    </>
  );
}
