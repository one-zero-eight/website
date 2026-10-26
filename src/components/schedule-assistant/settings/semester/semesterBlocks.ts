import type { SchemaTermBlock } from "@/api/schedule-assistant/types.ts";

export type SemesterBlock = SchemaTermBlock;

export type SemesterPeriod = { start_date: string; end_date: string };

const DAY_MS = 86_400_000;

export function dateToDay(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(timestamp)) return NaN;
  if (new Date(timestamp).toISOString().slice(0, 10) !== value) return NaN;
  return timestamp / DAY_MS;
}

function dayToDate(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

export function sortSemesterBlocks(
  blocks: readonly SemesterBlock[],
): SemesterBlock[] {
  return [...blocks].sort(
    (a, b) =>
      a.start_date.localeCompare(b.start_date) ||
      a.end_date.localeCompare(b.end_date) ||
      a.id.localeCompare(b.id),
  );
}

export function validateSemesterBlocks(
  semester: SemesterPeriod,
  blocks: readonly SemesterBlock[],
): string | null {
  const start = dateToDay(semester.start_date);
  const end = dateToDay(semester.end_date);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) {
    return "Задайте корректные даты семестра: начало не позже окончания.";
  }
  const ids = new Set<string>();
  let previousEnd = -Infinity;
  for (const block of sortSemesterBlocks(blocks)) {
    if (
      !block.id.trim() ||
      ids.has(block.id) ||
      block.id === "all" ||
      block.id === "semester"
    ) {
      return "Идентификаторы блоков должны быть уникальными и непустыми.";
    }
    ids.add(block.id);
    if (!block.name.trim()) return "Укажите название каждого блока.";
    const blockStart = dateToDay(block.start_date);
    const blockEnd = dateToDay(block.end_date);
    if (
      !Number.isFinite(blockStart) ||
      !Number.isFinite(blockEnd) ||
      blockStart > blockEnd
    ) {
      return `«${block.name}»: укажите корректные даты, начало не позже окончания.`;
    }
    if (blockStart < start || blockEnd > end) {
      return `«${block.name}»: даты блока должны быть внутри семестра.`;
    }
    if (blockStart <= previousEnd) {
      return `«${block.name}»: блоки не должны пересекаться, включая граничные даты.`;
    }
    previousEnd = blockEnd;
  }
  return null;
}

/** Both ends are inclusive; an odd extra day belongs to the first block. */
export function splitSemesterInTwo(semester: SemesterPeriod): SemesterBlock[] {
  if (validateSemesterBlocks(semester, [])) return [];
  const start = dateToDay(semester.start_date);
  const end = dateToDay(semester.end_date);
  if (end <= start) return [];
  const midpoint = start + Math.ceil((end - start + 1) / 2) - 1;
  return [
    {
      id: "block-1",
      name: "Блок 1",
      start_date: semester.start_date,
      end_date: dayToDate(midpoint),
    },
    {
      id: "block-2",
      name: "Блок 2",
      start_date: dayToDate(midpoint + 1),
      end_date: semester.end_date,
    },
  ];
}

export function firstAvailableBlockPeriod(
  semester: SemesterPeriod,
  blocks: readonly SemesterBlock[],
): SemesterPeriod | null {
  if (validateSemesterBlocks(semester, blocks)) return null;
  let nextStart = dateToDay(semester.start_date);
  for (const block of sortSemesterBlocks(blocks)) {
    const blockStart = dateToDay(block.start_date);
    if (nextStart < blockStart) {
      return {
        start_date: dayToDate(nextStart),
        end_date: dayToDate(blockStart - 1),
      };
    }
    nextStart = dateToDay(block.end_date) + 1;
  }
  if (nextStart > dateToDay(semester.end_date)) return null;
  return { start_date: dayToDate(nextStart), end_date: semester.end_date };
}
