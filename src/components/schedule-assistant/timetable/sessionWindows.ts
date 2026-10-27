import type {
  SchemaDateRange,
  SchemaTermBlock,
} from "@/api/schedule-assistant/types.ts";
import { expandStudentGroupSelectors } from "@/components/schedule-assistant/config/studentGroupSelectors.ts";
import {
  buildGroupToProgramMap,
  programSemesterRange,
  termSemesterRange,
} from "./programTimeSlots.ts";
import type { TimetableViewConfig } from "./timetableViewTypes.ts";

/** Intersect audience program windows, then apply an optional session range.
 * Program teaching windows replace, rather than intersect, the term default.
 */
export function resolveSessionWindow(
  config: TimetableViewConfig,
  audience: string[],
  active?: SchemaDateRange | null,
  blockId?: string | null,
): SchemaDateRange | null {
  const termRange = termSemesterRange(config);
  const groupToProgram = buildGroupToProgramMap(config);
  const groups = expandStudentGroupSelectors(config, audience);
  const windows = groups.length
    ? groups.map((group) =>
        programSemesterRange(groupToProgram.get(group), termRange),
      )
    : [termRange];
  const window = sessionWindowRange(config, active, blockId);
  if (blockId != null && !window) return null;
  if (window) windows.push(window);

  const first = windows[0];
  if (!first) return null;
  let start = first.start_date;
  let end = first.end_date;
  for (const range of windows) {
    if (!range) return null;
    if (range.start_date > start) start = range.start_date;
    if (range.end_date < end) end = range.end_date;
  }
  if (start > end) return null;
  return { start_date: start, end_date: end };
}

/** Resolve a stored block reference, never infer one from custom dates. */
export function matchSessionBlock(
  config: TimetableViewConfig,
  blockId?: string | null,
): SchemaTermBlock | null {
  if (blockId == null) return null;
  return config.term.blocks?.find((block) => block.id === blockId) ?? null;
}

/** The explicit series bounds before intersecting audience teaching windows. */
export function sessionWindowRange(
  config: TimetableViewConfig,
  active?: SchemaDateRange | null,
  blockId?: string | null,
): SchemaDateRange | null {
  if (blockId != null) {
    const block = matchSessionBlock(config, blockId);
    return block
      ? { start_date: block.start_date, end_date: block.end_date }
      : null;
  }
  return active ?? null;
}
