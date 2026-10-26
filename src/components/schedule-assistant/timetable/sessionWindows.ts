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
): SchemaDateRange | null {
  const termRange = termSemesterRange(config);
  const groupToProgram = buildGroupToProgramMap(config);
  const groups = expandStudentGroupSelectors(config, audience);
  const windows = groups.length
    ? groups.map((group) =>
        programSemesterRange(groupToProgram.get(group), termRange),
      )
    : [termRange];
  if (active) windows.push(active);

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

/** Match the stored explicit range, not the audience-clipped effective window. */
export function matchSessionBlock(
  config: TimetableViewConfig,
  active?: SchemaDateRange | null,
): SchemaTermBlock | null {
  if (!active) return null;
  return (
    (config.term.blocks ?? []).find(
      (block) =>
        block.start_date === active.start_date &&
        block.end_date === active.end_date,
    ) ?? null
  );
}
