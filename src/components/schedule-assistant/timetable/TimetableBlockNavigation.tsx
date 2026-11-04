import type { SchemaTermBlock } from "@/api/schedule-assistant/types.ts";
import { useLingui } from "@lingui/react/macro";
import { localizedBlockName } from "./localizedNames.ts";
import type { WeekRange } from "./timetableViewerModel.ts";

export function TimetableWeekBlockLabel({
  blocks,
  week,
}: {
  blocks: SchemaTermBlock[];
  week: WeekRange | undefined;
}) {
  const { i18n } = useLingui();
  if (!week) return null;
  const activeBlocks = blocks.filter(
    (block) => block.start_date <= week.end && block.end_date >= week.start,
  );
  if (!activeBlocks.length) return null;

  return (
    <span
      key={i18n.locale}
      className="shrink-0 rounded border border-[#d8dfeb] bg-[#edf4ff] px-2 py-1 text-xs font-medium text-[#1d3f70]"
    >
      {activeBlocks.map((block) => localizedBlockName(block)).join(" / ")}
    </span>
  );
}
