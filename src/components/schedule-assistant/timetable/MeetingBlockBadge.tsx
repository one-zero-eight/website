import { createContext, useContext } from "react";
import { parseMeetingInstanceId } from "./meetingEditUtils.ts";
import { rangesEqual } from "./timetableBlocks.ts";
import type { TimetableViewConfig } from "./timetableViewTypes.ts";

export const TeachingBlocksContext = createContext<TimetableViewConfig | null>(
  null,
);

export function MeetingBlockBadge({ instanceId }: { instanceId: string }) {
  const config = useContext(TeachingBlocksContext);
  const ref = parseMeetingInstanceId(instanceId);
  if (!config || !ref) return null;
  const series =
    config.courses?.[ref.courseIdx]?.components[ref.componentIdx]?.sessions?.[
      ref.seriesIdx
    ];
  if (!series?.active) return null;
  const block = config.term.blocks?.find((candidate) =>
    rangesEqual(candidate, series.active),
  );
  if (!block) return null;
  return (
    <span className="ml-1 inline-block rounded border border-current/20 px-1 text-[9px] font-normal">
      {block.name}
    </span>
  );
}
