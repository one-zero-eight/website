import type {
  SchemaScheduleConfig,
  SchemaSectionProgram,
  SchemaTermTimeSlot,
} from "@/api/schedule-assistant/types.ts";
import { getScheduleSections } from "@/components/schedule-assistant/config/scheduleConfigUtils.ts";
import { normalizeTracksFromSectionProgram } from "@/components/schedule-assistant/settings/groups/normalizeTrackFromSectionProgram.ts";

export type ResolvedTimeSlot = {
  start: string;
  end: string;
  label: string;
};

export function normalizeHhmm(value: string | null | undefined): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (raw.length >= 5 && raw[2] === ":") return raw.slice(0, 5);
  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return raw;
  return `${match[1]!.padStart(2, "0")}:${match[2]}`;
}

export function toMinutes(timeStr: string): number {
  const [h, m] = normalizeHhmm(timeStr).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function slotFromTermLike(
  slot: SchemaTermTimeSlot | string,
): ResolvedTimeSlot | null {
  if (typeof slot === "string") {
    const start = normalizeHhmm(slot);
    if (!start) return null;
    const endMinutes = toMinutes(start) + 90;
    const end = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
    return { start, end, label: `${start}-${end}` };
  }
  const start = normalizeHhmm(slot.start_time);
  const end = normalizeHhmm(slot.end_time);
  if (!start || !end) return null;
  return { start, end, label: `${start}-${end}` };
}

export function termResolvedTimeSlots(
  config: SchemaScheduleConfig | null | undefined,
): ResolvedTimeSlot[] {
  const out: ResolvedTimeSlot[] = [];
  const seen = new Set<string>();
  for (const slot of config?.term?.time_slots || []) {
    const resolved = slotFromTermLike(slot);
    if (!resolved || seen.has(resolved.start)) continue;
    seen.add(resolved.start);
    out.push(resolved);
  }
  return out;
}

export function programResolvedTimeSlots(
  program: SchemaSectionProgram | null | undefined,
  fallback: ResolvedTimeSlot[],
): ResolvedTimeSlot[] {
  const custom = program?.time_slots;
  if (!custom?.length) return fallback;
  const out: ResolvedTimeSlot[] = [];
  const seen = new Set<string>();
  for (const slot of custom) {
    const resolved = slotFromTermLike(slot);
    if (!resolved || seen.has(resolved.start)) continue;
    seen.add(resolved.start);
    out.push(resolved);
  }
  return out.length ? out : fallback;
}

/** Map group id → program (first match in sections order). */
export function buildGroupToProgramMap(
  config: SchemaScheduleConfig | null | undefined,
): Map<string, SchemaSectionProgram> {
  const out = new Map<string, SchemaSectionProgram>();
  for (const section of getScheduleSections(config)) {
    for (const program of section.programs || []) {
      for (const track of normalizeTracksFromSectionProgram(program)) {
        for (const groupId of track.groups || []) {
          const id = String(groupId);
          if (!out.has(id)) out.set(id, program);
        }
      }
    }
  }
  return out;
}

export function findProgramByNameOrCode(
  config: SchemaScheduleConfig | null | undefined,
  yearLabel: string,
): SchemaSectionProgram | null {
  const needle = String(yearLabel || "").trim();
  if (!needle) return null;
  for (const section of getScheduleSections(config)) {
    for (const program of section.programs || []) {
      if (String(program.code || "").trim() === needle) return program;
      if (String(program.name || "").trim() === needle) return program;
    }
  }
  return null;
}

export function unionResolvedTimeSlots(
  slotLists: ResolvedTimeSlot[][],
): ResolvedTimeSlot[] {
  const byStart = new Map<string, ResolvedTimeSlot>();
  for (const list of slotLists) {
    for (const slot of list) {
      if (!byStart.has(slot.start)) byStart.set(slot.start, slot);
    }
  }
  return Array.from(byStart.values()).sort(
    (a, b) => toMinutes(a.start) - toMinutes(b.start),
  );
}

/** Union by start; later lists overwrite the same start (end/label). */
export function mergeResolvedTimeSlots(
  slotLists: ResolvedTimeSlot[][],
): ResolvedTimeSlot[] {
  const byStart = new Map<string, ResolvedTimeSlot>();
  for (const list of slotLists) {
    for (const slot of list) {
      byStart.set(slot.start, slot);
    }
  }
  return Array.from(byStart.values()).sort(
    (a, b) => toMinutes(a.start) - toMinutes(b.start),
  );
}

export function timeSlotStartsSubset(
  a: ResolvedTimeSlot[],
  b: ResolvedTimeSlot[],
): boolean {
  if (!a.length) return true;
  if (!b.length) return false;
  const starts = new Set(b.map((slot) => slot.start));
  return a.every((slot) => starts.has(slot.start));
}

/** True when one list's starts are a subset of the other's (can share one column). */
export function timeSlotsCompatible(
  a: ResolvedTimeSlot[],
  b: ResolvedTimeSlot[],
): boolean {
  return timeSlotStartsSubset(a, b) || timeSlotStartsSubset(b, a);
}

/**
 * Extra program time columns only when slots are incompatible with the nearest
 * time column to the left. Compatible programs merge into that column (union).
 */
export function resolveProgramTimeColumns(
  yearLabels: string[],
  slotsByProgramLabel: Record<string, ResolvedTimeSlot[]>,
  baseSlots: ResolvedTimeSlot[],
): {
  showProgramTimeColumn: Record<string, boolean>;
  stickyLeftSlots: ResolvedTimeSlot[];
} {
  const showProgramTimeColumn: Record<string, boolean> = {};
  let leftColumnSlots = baseSlots;
  let stickyLeftSlots = baseSlots;
  let pastFirstBreak = false;

  for (const label of yearLabels) {
    const slots = slotsByProgramLabel[label] || baseSlots;
    if (timeSlotsCompatible(slots, leftColumnSlots)) {
      showProgramTimeColumn[label] = false;
      leftColumnSlots = mergeResolvedTimeSlots([leftColumnSlots, slots]);
      if (!pastFirstBreak) stickyLeftSlots = leftColumnSlots;
      continue;
    }
    showProgramTimeColumn[label] = true;
    pastFirstBreak = true;
    leftColumnSlots = slots;
  }

  return { showProgramTimeColumn, stickyLeftSlots };
}

/** True when program slot starts are a subset of reference slot starts. */
export function programSlotsMatchTerm(
  programSlots: ResolvedTimeSlot[],
  termSlots: ResolvedTimeSlot[],
): boolean {
  return timeSlotStartsSubset(programSlots, termSlots);
}

/**
 * Label to show in a program sticky time column for a term-grid row.
 * Exact match first; otherwise nearest program slot within maxDeltaMinutes.
 */
export function programSlotLabelForTermRow(
  programSlots: ResolvedTimeSlot[],
  termStart: string,
  maxDeltaMinutes = 30,
): string | null {
  if (!programSlots.length) return null;
  const exact = programSlots.find((slot) => slot.start === termStart);
  if (exact) return exact.label;
  const nearest = nearestSlotStart(termStart, programSlots);
  if (!nearest) return null;
  if (Math.abs(toMinutes(nearest) - toMinutes(termStart)) > maxDeltaMinutes) {
    return null;
  }
  return programSlots.find((slot) => slot.start === nearest)?.label ?? null;
}

/** True when both lists have the same start/end pairs in the same order. */
export function sameResolvedTimeSlots(
  a: ResolvedTimeSlot[],
  b: ResolvedTimeSlot[],
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i]!.start !== b[i]!.start || a[i]!.end !== b[i]!.end) return false;
  }
  return true;
}

/** Nearest configured slot start for an off-grid meeting start. */
export function nearestSlotStart(
  meetingStart: string,
  slots: ResolvedTimeSlot[],
): string | null {
  if (!slots.length) return null;
  const target = toMinutes(meetingStart);
  let best = slots[0]!;
  let bestDist = Math.abs(toMinutes(best.start) - target);
  for (const slot of slots) {
    const dist = Math.abs(toMinutes(slot.start) - target);
    if (dist < bestDist) {
      best = slot;
      bestDist = dist;
    }
  }
  return best.start;
}

export function isMeetingOnSlot(
  meetingStart: string,
  meetingEnd: string | undefined,
  slot: ResolvedTimeSlot,
): boolean {
  const start = normalizeHhmm(meetingStart);
  if (start !== slot.start) return false;
  if (!meetingEnd) return true;
  return normalizeHhmm(meetingEnd) === slot.end;
}
