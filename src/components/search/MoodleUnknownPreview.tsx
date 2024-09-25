import { search } from "@/lib/search";
import PreviewBottomButton from "./PreviewBottomButton";

export declare type MoodleUnknownPreviewProps = {
  source: search.MoodleUnknownSource;
};

export default function MoodleUnknownPreview({
  source,
}: MoodleUnknownPreviewProps) {
  return (
    <>
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
