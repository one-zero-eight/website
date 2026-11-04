import type {
  SchemaDateRange,
  SchemaSessionActiveWindow,
  SchemaTermBlock,
} from "@/api/schedule-assistant/types.ts";
import { expandStudentGroupSelectors } from "@/components/schedule-assistant/config/studentGroupSelectors.ts";
import {
  buildGroupToProgramMap,
  programSemesterRange,
  termSemesterRange,
} from "./programTimeSlots.ts";
import type { TimetableViewConfig } from "./timetableViewTypes.ts";

export function activeForBlock(blockId: string): SchemaSessionActiveWindow {
  return { block: blockId };
}

export function blockIdFromActive(
  active?: SchemaSessionActiveWindow | null,
): string | null {
  return active && "block" in active ? active.block : null;
}

/** Resolve a stored block reference by id. */
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
  active?: SchemaSessionActiveWindow | null,
): SchemaDateRange | null {
  if (!active) return null;
  const range =
    "block" in active ? matchSessionBlock(config, active.block) : active;
  if (!range || range.start_date > range.end_date) return null;
  return { start_date: range.start_date, end_date: range.end_date };
}

/** Intersect audience program windows, then apply an optional session range.
 * Program teaching windows replace, rather than intersect, the term default.
 */
export function resolveSessionWindow(
  config: TimetableViewConfig,
  audience: string[],
  active?: SchemaSessionActiveWindow | null,
): SchemaDateRange | null {
  const termRange = termSemesterRange(config);
  const groupToProgram = buildGroupToProgramMap(config);
  const groups = expandStudentGroupSelectors(config, audience);
  const windows = groups.length
    ? groups.map((group) =>
        programSemesterRange(groupToProgram.get(group), termRange),
      )
    : [termRange];
  const window = sessionWindowRange(config, active);
  if (active != null && !window) return null;
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
