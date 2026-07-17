import type {
  SchemaCourseConfig,
  SchemaScheduleConfig,
  SchemaSessionOccurrence,
  SchemaWeeklyPatternSlot,
  SchemaWeeklyPatternSlotEdit,
} from "@/api/schedule-assistant/types.ts";
import { Weekday } from "@/api/schedule-assistant/types.ts";
import { getScheduleSections } from "@/components/schedule-assistant/config/scheduleConfigUtils.ts";
import {
  expandStudentGroupSelectors,
  isStudentGroupSelector,
} from "@/components/schedule-assistant/config/studentGroupSelectors.ts";
import { normalizeTracksFromSectionProgram } from "@/components/schedule-assistant/settings/groups/normalizeTrackFromSectionProgram.ts";
import {
  termWeekdayKeyToWeekday,
  type TermWeekdayKey,
} from "@/components/schedule-assistant/settings/weekdays.ts";
import {
  buildAudienceSelectorTree,
  minimizeAudienceTokens,
} from "./audienceSelectorTree.ts";
import {
  add90m,
  dayKey,
  normalizedTermDays,
  semesterDatesForWeekday,
  weekStartForDate,
  weeklyPatternDayKey,
  type Meeting,
} from "./timetableViewerModel.ts";

function formatLocalDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type MeetingRef =
  | {
      kind: "occ";
      courseIdx: number;
      componentIdx: number;
      seriesIdx: number;
      occIdx: number;
    }
  | {
      kind: "wp";
      courseIdx: number;
      componentIdx: number;
      seriesIdx: number;
      slotIdx: number;
      date: string;
    };

export type EditClassAction =
  | "room"
  | "time"
  | "weekday"
  | "instructor"
  | "cancel";
export type EditClassScope = "single" | "future" | "all";

export type MeetingFieldEdits = {
  room?: string;
  time?: string;
  weekday?: TermWeekdayKey;
  instructor?: string | string[] | null;
  audience?: string[];
  cancel?: boolean;
};

export type MeetingOriginalValues = {
  room: string;
  time: string;
  weekday: TermWeekdayKey;
  instructor: string;
  audience: string[];
};

export function meetingAudienceEqual(a: string[], b: string[]) {
  const normalize = (items: string[]) =>
    [...new Set(items.map((item) => String(item || "").trim()).filter(Boolean))]
      .sort()
      .join("|");
  return normalize(a) === normalize(b);
}

export function parseAudienceTokensInput(value: string) {
  return value
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);
}

export function serializeAudienceTokens(tokens: string[]) {
  return tokens
    .map((token) => String(token || "").trim())
    .filter(Boolean)
    .join(", ");
}

export function resolveMeetingAudienceTokens(
  component:
    | { student_groups?: string[]; per_group?: boolean }
    | null
    | undefined,
  series: { audience?: string[] } | null | undefined,
  meetingGroups?: string[],
) {
  const explicit = series?.audience || [];
  if (explicit.length) return [...explicit];
  if (component?.per_group && meetingGroups?.length) {
    return [String(meetingGroups[0] || "").trim()].filter(Boolean);
  }
  return [...(component?.student_groups || [])];
}

export function audienceTokensEquivalent(
  config: SchemaScheduleConfig,
  a: string[],
  b: string[],
) {
  if (meetingAudienceEqual(a, b)) return true;
  const expandedA = [...new Set(expandStudentGroupSelectors(config, a))].sort();
  const expandedB = [...new Set(expandStudentGroupSelectors(config, b))].sort();
  if (!expandedA.length || !expandedB.length) return false;
  return expandedA.join("|") === expandedB.join("|");
}

export function isMeetingAudienceOverridden(
  config: SchemaScheduleConfig,
  component:
    | { student_groups?: string[]; per_group?: boolean }
    | null
    | undefined,
  series: { audience?: string[] } | null | undefined,
) {
  if (!component || component.per_group) return false;
  const explicit = series?.audience || [];
  if (!explicit.length) return false;
  return !audienceTokensEquivalent(
    config,
    explicit,
    component.student_groups || [],
  );
}

function studentGroupNameByCode(config: SchemaScheduleConfig) {
  return new Map(
    (config.students_groups ?? []).map((group) => [
      String(group.code || "").trim(),
      String(group.name || group.code || "").trim(),
    ]),
  );
}

export function formatAudienceTokenLabel(
  config: SchemaScheduleConfig,
  token: string,
) {
  const trimmed = String(token || "").trim();
  if (!trimmed) return "";
  if (isStudentGroupSelector(trimmed)) return trimmed;
  const name = studentGroupNameByCode(config).get(trimmed);
  if (name && name !== trimmed) return `${name} (${trimmed})`;
  return trimmed;
}

export function formatAudienceTokensCompact(tokens: string[]) {
  if (!tokens.length) return "—";
  return tokens
    .map((token) => String(token || "").trim())
    .filter(Boolean)
    .join(", ");
}

export function formatAudienceTokensLabel(
  config: SchemaScheduleConfig,
  tokens: string[],
) {
  if (!tokens.length) return "—";
  return tokens
    .map((token) => formatAudienceTokenLabel(config, token))
    .filter(Boolean)
    .join(", ");
}

export function audienceTokenHints(
  config: SchemaScheduleConfig,
  component: { student_groups?: string[] } | null | undefined,
): { value: string; label: string }[] {
  const seen = new Set<string>();
  const hints: { value: string; label: string }[] = [];

  function push(value: string, label: string) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    hints.push({ value: trimmed, label });
  }

  for (const token of component?.student_groups || []) {
    push(token, formatAudienceTokenLabel(config, token));
  }

  for (const section of getScheduleSections(config)) {
    for (const program of section.programs || []) {
      const code = String(program.code || "").trim();
      if (!code) continue;
      const title = String(program.name || code).trim();
      push(`@${code}`, `@${code}${title !== code ? ` (${title})` : ""}`);
      for (const track of normalizeTracksFromSectionProgram(program)) {
        const trackRef = String(track.code || track.name || "").trim();
        if (!trackRef) continue;
        push(`@${code}/${trackRef}`, `@${code}/${trackRef}`);
      }
    }
  }

  for (const group of config.students_groups || []) {
    const code = String(group.code || "").trim();
    if (!code) continue;
    push(code, formatAudienceTokenLabel(config, code));
  }

  return hints.sort((a, b) => a.value.localeCompare(b.value, "ru"));
}

export function meetingEditOriginalValues(
  meeting: Meeting,
  component:
    | { student_groups?: string[]; per_group?: boolean }
    | null
    | undefined,
  series: { audience?: string[] } | null | undefined,
): MeetingOriginalValues {
  const instructors =
    typeof meeting.instructors === "string"
      ? meeting.instructors
      : meeting.instructors?.[0] || "";
  return {
    room: String(meeting.room || "").trim(),
    time: String(meeting.start || "").slice(0, 5),
    weekday: currentMeetingWeekday(meeting),
    instructor: String(instructors || "").trim(),
    audience: resolveMeetingAudienceTokens(component, series, meeting.groups),
  };
}

/** @deprecated Use formatAudienceTokensLabel */
export function formatMeetingGroupsLabel(
  config: SchemaScheduleConfig,
  groupCodes: string[],
) {
  return formatAudienceTokensLabel(config, groupCodes);
}

/** @deprecated Use meetingAudienceEqual */
export function meetingGroupsEqual(a: string[], b: string[]) {
  return meetingAudienceEqual(a, b);
}

export function componentStudentGroupPool(
  config: SchemaScheduleConfig,
  component: { student_groups?: string[] },
) {
  return expandStudentGroupSelectors(config, component.student_groups || []);
}

export function perGroupAudienceOptions(
  config: SchemaScheduleConfig,
  component: { student_groups?: string[] },
) {
  return componentStudentGroupPool(config, component)
    .map((code) => ({
      value: code,
      label: formatAudienceTokenLabel(config, code),
    }))
    .sort((a, b) => a.value.localeCompare(b.value, "ru"));
}

export function meetingOriginalValues(meeting: Meeting): MeetingOriginalValues {
  const instructors =
    typeof meeting.instructors === "string"
      ? meeting.instructors
      : meeting.instructors?.[0] || "";
  return {
    room: String(meeting.room || "").trim(),
    time: String(meeting.start || "").slice(0, 5),
    weekday: currentMeetingWeekday(meeting),
    instructor: String(instructors || "").trim(),
    audience: [...(meeting.groups || [])].sort((a, b) =>
      a.localeCompare(b, "ru"),
    ),
  };
}

const WEEKDAY_TO_JS_INDEX: Record<Weekday, number> = {
  [Weekday.MONDAY]: 0,
  [Weekday.TUESDAY]: 1,
  [Weekday.WEDNESDAY]: 2,
  [Weekday.THURSDAY]: 3,
  [Weekday.FRIDAY]: 4,
  [Weekday.SATURDAY]: 5,
  [Weekday.SUNDAY]: 6,
};

export function parseMeetingInstanceId(instanceId: string): MeetingRef | null {
  const parts = instanceId.split(":");
  if (parts.length < 5) return null;
  const courseIdx = Number(parts[0]);
  const componentIdx = Number(parts[1]);
  const seriesIdx = Number(parts[2]);
  const kind = parts[3];
  if (!Number.isFinite(courseIdx) || !Number.isFinite(componentIdx))
    return null;
  if (!Number.isFinite(seriesIdx)) return null;

  if (kind === "occ" && parts.length === 5) {
    const occIdx = Number(parts[4]);
    if (!Number.isFinite(occIdx)) return null;
    return { kind: "occ", courseIdx, componentIdx, seriesIdx, occIdx };
  }

  if (kind === "wp" && parts.length === 6) {
    const slotIdx = Number(parts[4]);
    if (!Number.isFinite(slotIdx)) return null;
    return {
      kind: "wp",
      courseIdx,
      componentIdx,
      seriesIdx,
      slotIdx,
      date: parts[5]!,
    };
  }

  return null;
}

function normalizeTimeToApi(value: string): string {
  const trimmed = String(value || "").trim();
  if (/^\d{2}:\d{2}$/.test(trimmed)) return `${trimmed}:00`;
  if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  return trimmed;
}

export function resolveEndTimeForStart(
  config: SchemaScheduleConfig,
  startTime: string,
): string {
  const start5 = String(startTime).slice(0, 5);
  for (const slot of config.term.time_slots || []) {
    const slotStart =
      typeof slot === "string"
        ? String(slot).trim().slice(0, 5)
        : String(slot.start_time).slice(0, 5);
    if (slotStart === start5) {
      const end =
        typeof slot === "string"
          ? add90m(slotStart)
          : String(slot.end_time).slice(0, 5);
      return normalizeTimeToApi(end);
    }
  }
  return normalizeTimeToApi(add90m(start5));
}

function upsertWeeklyEdit(
  edits: SchemaWeeklyPatternSlotEdit[],
  selectWeek: string,
  patch: Partial<SchemaWeeklyPatternSlotEdit>,
): SchemaWeeklyPatternSlotEdit[] {
  const next = [...edits];
  const idx = next.findIndex((edit) => edit.select_week === selectWeek);
  const base: SchemaWeeklyPatternSlotEdit = {
    select_week: selectWeek,
    cancel: false,
  };
  if (idx >= 0) {
    next[idx] = { ...next[idx]!, ...patch, select_week: selectWeek };
    return next;
  }
  next.push({ ...base, ...patch, select_week: selectWeek });
  return next;
}

function dateForWeekdayInWeek(
  weekAnchorDate: string,
  weekday: TermWeekdayKey,
  startingDay: Weekday,
): string {
  const weekStart = weekStartForDate(weekAnchorDate, startingDay);
  const start = new Date(`${weekStart}T00:00:00`);
  const targetIdx = WEEKDAY_TO_JS_INDEX[termWeekdayKeyToWeekday(weekday)] ?? 0;
  const startIdx = WEEKDAY_TO_JS_INDEX[startingDay] ?? 0;
  const offset = (targetIdx - startIdx + 7) % 7;
  const result = new Date(start);
  result.setDate(start.getDate() + offset);
  return formatLocalDate(result);
}

function weeklyMeetingDatesForSlot(
  config: SchemaScheduleConfig,
  slot: SchemaWeeklyPatternSlot,
): string[] {
  const weekday = weeklyPatternDayKey(String(slot.weekday));
  if (!weekday) return [];
  return semesterDatesForWeekday(config, weekday);
}

function getWeeklySlotContext(
  course: SchemaCourseConfig,
  ref: Extract<MeetingRef, { kind: "wp" }>,
) {
  const component = course.components?.[ref.componentIdx];
  const series = component?.sessions?.[ref.seriesIdx];
  const slot = series?.weekly_pattern?.[ref.slotIdx];
  if (!component || !series || !slot) return null;
  return { component, series, slot };
}

function getOccurrenceContext(
  course: SchemaCourseConfig,
  ref: Extract<MeetingRef, { kind: "occ" }>,
) {
  const component = course.components?.[ref.componentIdx];
  const series = component?.sessions?.[ref.seriesIdx];
  const occurrence = series?.occurrences?.[ref.occIdx];
  if (!component || !series || !occurrence) return null;
  return { component, series, occurrence };
}

function applyWeeklySingleEdit(
  slot: SchemaWeeklyPatternSlot,
  meetingDate: string,
  startingDay: Weekday,
  patch: Partial<SchemaWeeklyPatternSlotEdit>,
) {
  const selectWeek = weekStartForDate(meetingDate, startingDay);
  slot.edits = upsertWeeklyEdit(slot.edits || [], selectWeek, patch);
}

function preservePastWeeksBeforeDate(
  config: SchemaScheduleConfig,
  slot: SchemaWeeklyPatternSlot,
  fromDate: string,
  snapshot: {
    weekday: TermWeekdayKey;
    startTime: string;
    endTime: string;
    room: string | null;
    instructor: string | string[] | null;
  },
) {
  const startingDay = config.term.starting_day ?? Weekday.MONDAY;
  const oldWeekday = weeklyPatternDayKey(String(snapshot.weekday));
  if (!oldWeekday) return;
  for (const date of semesterDatesForWeekday(config, oldWeekday)) {
    if (date >= fromDate) continue;
    applyWeeklySingleEdit(slot, date, startingDay, {
      date,
      start_time: normalizeTimeToApi(snapshot.startTime),
      end_time: normalizeTimeToApi(snapshot.endTime),
      room: snapshot.room,
      instructor: snapshot.instructor,
      cancel: false,
    });
  }
}

function applyWeeklyFutureScope(
  config: SchemaScheduleConfig,
  slot: SchemaWeeklyPatternSlot,
  meetingDate: string,
  mutator: (slot: SchemaWeeklyPatternSlot) => void,
) {
  const snapshot = {
    weekday: weeklyPatternDayKey(String(slot.weekday)) || dayKey(meetingDate),
    startTime: String(slot.start_time).slice(0, 5),
    endTime: String(slot.end_time).slice(0, 5),
    room: slot.room ?? null,
    instructor: slot.instructor ?? null,
  };
  preservePastWeeksBeforeDate(config, slot, meetingDate, snapshot);
  mutator(slot);
}

function applyOccurrencePatch(
  occurrences: SchemaSessionOccurrence[],
  fromDate: string,
  scope: EditClassScope,
  patcher: (
    occurrence: SchemaSessionOccurrence,
  ) => SchemaSessionOccurrence | null,
) {
  return occurrences
    .map((occurrence, index, arr) => {
      const date = occurrence.date;
      const include =
        scope === "all" ||
        (scope === "single" && date === fromDate) ||
        (scope === "future" && date >= fromDate);
      if (!include) return occurrence;
      return patcher(occurrence) ?? arr[index];
    })
    .filter(
      (occurrence): occurrence is SchemaSessionOccurrence => !!occurrence,
    );
}

function buildWeeklySingleEditPatch(
  config: SchemaScheduleConfig,
  edits: MeetingFieldEdits,
  meetingDate: string,
  startingDay: Weekday,
): Partial<SchemaWeeklyPatternSlotEdit> {
  const patch: Partial<SchemaWeeklyPatternSlotEdit> = { cancel: false };
  if (edits.room !== undefined) patch.room = edits.room;
  if (edits.time !== undefined) {
    const start = normalizeTimeToApi(edits.time);
    patch.start_time = start;
    patch.end_time = resolveEndTimeForStart(config, start);
  }
  if (edits.weekday !== undefined) {
    patch.date = dateForWeekdayInWeek(meetingDate, edits.weekday, startingDay);
  }
  if (edits.instructor !== undefined) patch.instructor = edits.instructor;
  return patch;
}

function patchSlotFromEdits(
  slot: SchemaWeeklyPatternSlot,
  config: SchemaScheduleConfig,
  edits: MeetingFieldEdits,
) {
  if (edits.room !== undefined) slot.room = edits.room;
  if (edits.time !== undefined) {
    const start = normalizeTimeToApi(edits.time);
    slot.start_time = start;
    slot.end_time = resolveEndTimeForStart(config, start);
  }
  if (edits.weekday !== undefined) {
    slot.weekday = termWeekdayKeyToWeekday(edits.weekday);
  }
  if (edits.instructor !== undefined) slot.instructor = edits.instructor;
}

function patchOccurrenceFromEdits(
  occurrence: SchemaSessionOccurrence,
  config: SchemaScheduleConfig,
  edits: MeetingFieldEdits,
  startingDay: Weekday,
): SchemaSessionOccurrence {
  const patched = { ...occurrence };
  if (edits.room !== undefined) patched.room = edits.room;
  if (edits.time !== undefined) {
    const start = normalizeTimeToApi(edits.time);
    patched.start_time = start;
    patched.end_time = resolveEndTimeForStart(config, start);
  }
  if (edits.weekday !== undefined) {
    patched.date = dateForWeekdayInWeek(
      occurrence.date,
      edits.weekday,
      startingDay,
    );
  }
  if (edits.instructor !== undefined) patched.instructor = edits.instructor;
  return patched;
}

export function applyMeetingEditsToCourse(
  course: SchemaCourseConfig,
  ref: MeetingRef,
  meeting: Meeting,
  config: SchemaScheduleConfig,
  scope: EditClassScope,
  edits: MeetingFieldEdits,
): SchemaCourseConfig | null {
  const nextCourse = structuredClone(course);
  const startingDay = config.term.starting_day ?? Weekday.MONDAY;

  if (edits.audience !== undefined) {
    const component = nextCourse.components?.[ref.componentIdx];
    const series = component?.sessions?.[ref.seriesIdx];
    if (!component || !series) return null;
    series.audience = minimizeAudienceTokens(
      edits.audience.map((token) => String(token || "").trim()).filter(Boolean),
      buildAudienceSelectorTree(config),
    );
  }

  if (ref.kind === "occ") {
    const ctx = getOccurrenceContext(nextCourse, ref);
    if (!ctx) return null;
    const occurrences = [...(ctx.series.occurrences || [])];
    const fromDate = meeting.date;

    if (edits.cancel) {
      const filtered =
        scope === "single"
          ? occurrences.filter((_, idx) => idx !== ref.occIdx)
          : occurrences.filter((occurrence) => {
              if (scope === "all") return false;
              return occurrence.date < fromDate;
            });
      ctx.series.occurrences = filtered;
      return nextCourse;
    }

    const patchOccurrence = (occurrence: SchemaSessionOccurrence) =>
      patchOccurrenceFromEdits(occurrence, config, edits, startingDay);

    if (scope === "single") {
      const target = occurrences[ref.occIdx];
      if (!target) return null;
      occurrences[ref.occIdx] = patchOccurrence(target);
      ctx.series.occurrences = occurrences;
      return nextCourse;
    }

    ctx.series.occurrences = applyOccurrencePatch(
      occurrences,
      fromDate,
      scope,
      (occurrence) => patchOccurrence(occurrence),
    );
    return nextCourse;
  }

  const ctx = getWeeklySlotContext(nextCourse, ref);
  if (!ctx) return null;
  const { slot } = ctx;
  const meetingDate = ref.date;

  if (edits.cancel) {
    if (scope === "single") {
      applyWeeklySingleEdit(slot, meetingDate, startingDay, { cancel: true });
      return nextCourse;
    }

    if (scope === "future") {
      for (const date of weeklyMeetingDatesForSlot(config, slot)) {
        if (date < meetingDate) continue;
        applyWeeklySingleEdit(slot, date, startingDay, { cancel: true });
      }
      return nextCourse;
    }

    ctx.series.weekly_pattern = (ctx.series.weekly_pattern || []).filter(
      (_, idx) => idx !== ref.slotIdx,
    );
    return nextCourse;
  }

  const patchSlotValue = () => patchSlotFromEdits(slot, config, edits);

  if (scope === "single") {
    applyWeeklySingleEdit(
      slot,
      meetingDate,
      startingDay,
      buildWeeklySingleEditPatch(config, edits, meetingDate, startingDay),
    );
    return nextCourse;
  }

  if (scope === "all") {
    patchSlotValue();
    return nextCourse;
  }

  applyWeeklyFutureScope(config, slot, meetingDate, patchSlotValue);
  return nextCourse;
}

function weeklyEditHasOnlyCancel(edit: SchemaWeeklyPatternSlotEdit) {
  return (
    edit.cancel &&
    !edit.date &&
    !edit.start_time &&
    !edit.room &&
    (edit.instructor === undefined || edit.instructor === null)
  );
}

function restoreWeeklySingleCancel(
  slot: SchemaWeeklyPatternSlot,
  meetingDate: string,
  startingDay: Weekday,
) {
  const edits = slot.edits || [];
  const idx = edits.findIndex(
    (edit) =>
      weekStartForDate(edit.select_week, startingDay) ===
      weekStartForDate(meetingDate, startingDay),
  );
  if (idx < 0) return false;

  const edit = edits[idx]!;
  if (!edit.cancel) return false;

  if (weeklyEditHasOnlyCancel(edit)) {
    slot.edits = edits.filter((_, itemIdx) => itemIdx !== idx);
  } else {
    slot.edits = edits.map((item, itemIdx) =>
      itemIdx === idx ? { ...item, cancel: false } : item,
    );
  }
  return true;
}

export function canRestoreMeeting(meeting: Meeting) {
  if (!meeting.cancelled) return false;
  const ref = parseMeetingInstanceId(meeting.instance_id);
  return ref?.kind === "wp";
}

export function restoreMeetingInCourse(
  course: SchemaCourseConfig,
  ref: Extract<MeetingRef, { kind: "wp" }>,
  config: SchemaScheduleConfig,
): SchemaCourseConfig | null {
  const nextCourse = structuredClone(course);
  const startingDay = config.term.starting_day ?? Weekday.MONDAY;
  const ctx = getWeeklySlotContext(nextCourse, ref);
  if (!ctx) return null;

  const restored = restoreWeeklySingleCancel(ctx.slot, ref.date, startingDay);
  if (!restored) return null;
  return nextCourse;
}

export function applyMeetingEditToCourse(
  course: SchemaCourseConfig,
  ref: MeetingRef,
  meeting: Meeting,
  config: SchemaScheduleConfig,
  action: EditClassAction,
  scope: EditClassScope,
  value: string | string[] | null,
): SchemaCourseConfig | null {
  if (action === "cancel") {
    return applyMeetingEditsToCourse(course, ref, meeting, config, scope, {
      cancel: true,
    });
  }

  const edits: MeetingFieldEdits = {};
  if (action === "room") edits.room = String(value ?? "");
  if (action === "time") edits.time = String(value ?? "");
  if (action === "weekday") edits.weekday = String(value) as TermWeekdayKey;
  if (action === "instructor") edits.instructor = value;

  return applyMeetingEditsToCourse(course, ref, meeting, config, scope, edits);
}

export function meetingInstructorsLabel(
  instructors: string | string[] | null | undefined,
) {
  if (!instructors) return "";
  return Array.isArray(instructors) ? instructors.join(" / ") : instructors;
}

export function weekdayOptionsForConfig(config: SchemaScheduleConfig) {
  return normalizedTermDays(config).map((day) => ({
    key: day,
    label:
      {
        Mon: "Понедельник",
        Tue: "Вторник",
        Wed: "Среда",
        Thu: "Четверг",
        Fri: "Пятница",
        Sat: "Суббота",
        Sun: "Воскресенье",
      }[day] ?? day,
  }));
}

export function timeOptionsForConfig(config: SchemaScheduleConfig) {
  return (config.term.time_slots || [])
    .map((slot) => {
      const start =
        typeof slot === "string"
          ? String(slot).trim().slice(0, 5)
          : String(slot.start_time).slice(0, 5);
      const end =
        typeof slot === "string"
          ? add90m(start)
          : String(slot.end_time).slice(0, 5);
      return { value: start, label: `${start}–${end}` };
    })
    .filter((slot) => slot.value);
}

export function currentMeetingWeekday(meeting: Meeting): TermWeekdayKey {
  return dayKey(meeting.date) as TermWeekdayKey;
}

export function getWeeklySlotFromMeeting(
  courses: SchemaCourseConfig[] | undefined,
  meeting: Meeting,
): SchemaWeeklyPatternSlot | null {
  const ref = parseMeetingInstanceId(meeting.instance_id);
  if (!ref || ref.kind !== "wp") return null;
  const course = courses?.find((item) => item.name === meeting.course);
  if (!course) return null;
  const component = course.components?.[ref.componentIdx];
  const series = component?.sessions?.[ref.seriesIdx];
  const slot = series?.weekly_pattern?.[ref.slotIdx];
  return slot ?? null;
}

export function meetingPatternBaseValues(
  slot: SchemaWeeklyPatternSlot,
): MeetingOriginalValues {
  const weekday = weeklyPatternDayKey(String(slot.weekday));
  const instructor = Array.isArray(slot.instructor)
    ? slot.instructor[0]
    : slot.instructor;
  return {
    room: String(slot.room ?? "").trim(),
    time: String(slot.start_time).slice(0, 5),
    weekday: (weekday || "Mon") as TermWeekdayKey,
    instructor: String(instructor ?? "").trim(),
    audience: [],
  };
}
