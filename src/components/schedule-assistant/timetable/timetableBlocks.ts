import type {
  SchemaDateRange,
  SchemaSessionActiveWindow,
  SchemaTermBlock,
} from "@/api/schedule-assistant/types.ts";
import { blockIdFromActive } from "./sessionWindows.ts";
import type { TimetableViewConfig } from "./timetableViewTypes.ts";
import {
  buildWeeks,
  type Meeting,
  type WeekRange,
} from "./timetableViewerModel.ts";

/** Include empty teaching weeks so a not-yet-placed block remains reachable. */
export function buildTeachingWeeks(
  config: TimetableViewConfig,
  meetings: Meeting[],
): WeekRange[] {
  const blocks = config.term.blocks ?? [];
  if (!blocks.length) return buildWeeks(meetings);

  let start = config.term.semester.start_date;
  let end = config.term.semester.end_date;
  for (const section of config.term.sections ?? []) {
    for (const program of section.programs ?? []) {
      if (!program.semester) continue;
      if (program.semester.start_date < start)
        start = program.semester.start_date;
      if (program.semester.end_date > end) end = program.semester.end_date;
    }
  }
  const weeks = new Map(buildWeeks(meetings).map((week) => [week.key, week]));
  const current = new Date(`${start}T00:00:00Z`);
  current.setUTCDate(current.getUTCDate() - ((current.getUTCDay() + 6) % 7));
  while (current.toISOString().slice(0, 10) <= end) {
    const monday = current.toISOString().slice(0, 10);
    const sunday = new Date(current);
    sunday.setUTCDate(sunday.getUTCDate() + 6);
    weeks.set(monday, {
      key: monday,
      start: monday,
      end: sunday.toISOString().slice(0, 10),
    });
    current.setUTCDate(current.getUTCDate() + 7);
  }
  return [...weeks.values()].sort((a, b) => a.start.localeCompare(b.start));
}

export function blockForWeekBoundary(
  blocks: SchemaTermBlock[],
  week: WeekRange,
) {
  return blocks.filter(
    (block) => block.start_date >= week.start && block.start_date <= week.end,
  );
}

type CourseWithSeriesBlocks = {
  components: {
    sessions?: { active?: SchemaSessionActiveWindow | null }[] | null;
  }[];
};

export function courseBlockIds(course: CourseWithSeriesBlocks): string[] {
  return [
    ...new Set(
      course.components.flatMap((component) =>
        (component.sessions ?? []).flatMap((series) => {
          const blockId = blockIdFromActive(series.active);
          return blockId ? [blockId] : [];
        }),
      ),
    ),
  ];
}

export function courseMatchesBlock(
  course: CourseWithSeriesBlocks,
  blockId: string,
) {
  if (blockId === "all") return true;
  const sessions = course.components.flatMap(
    (component) => component.sessions ?? [],
  );
  return (
    !sessions.length ||
    sessions.some((series) => {
      const seriesBlockId = blockIdFromActive(series.active);
      return seriesBlockId == null || seriesBlockId === blockId;
    })
  );
}

export function rangesEqual(
  first: SchemaDateRange | null | undefined,
  second: SchemaDateRange | null | undefined,
) {
  if (!first || !second) return !first && !second;
  return (
    first.start_date === second.start_date && first.end_date === second.end_date
  );
}
