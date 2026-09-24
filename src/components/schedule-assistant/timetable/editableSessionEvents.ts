import type {
  SchemaCourseConfig,
  SchemaScheduleConfig,
  SchemaSessionOccurrence,
  SchemaWeeklyPatternSlot,
  SchemaWeeklyPatternSlotEdit,
} from "@/api/schedule-assistant/types.ts";
import { Weekday } from "@/api/schedule-assistant/types.ts";

import {
  applySeriesScheduleToCourse,
  normalizeTypedHhmm,
  parseMeetingInstanceId,
  resolveEndTimeForStart,
  type MeetingRef,
} from "./meetingEditUtils.ts";
import { instructorValue } from "./sessionSeriesValidation.ts";
import { resolveAudienceSemester } from "./programTimeSlots.ts";
import {
  resolveWeeklyMeetingFields,
  semesterDatesForWeekday,
  weekStartForDate,
  weeklyPatternDayKey,
  type Meeting,
} from "./timetableViewerModel.ts";

export type EditableSessionEventSource =
  | {
      kind: "weekly";
      slotIdx: number;
      patternDate: string;
      selectWeek: string;
    }
  | {
      kind: "occurrence";
      draftId: string;
      occIdx: number | null;
    };

export type EditableSessionEvent = {
  key: string;
  source: EditableSessionEventSource;
  date: string;
  start_time: string;
  end_time: string;
  room: string | null;
  instructor: string | null;
  cancelled: boolean;
};

export type EditableSessionEventPatch = {
  date?: string;
  start_time?: string;
  end_time?: string;
  room?: string | null;
  instructor?: string | null;
  cancelled?: boolean;
};

function toApiTime(value: string): string {
  const hhmm = normalizeTypedHhmm(value).slice(0, 5);
  if (/^\d{2}:\d{2}$/.test(hhmm)) return `${hhmm}:00`;
  return value;
}

function toUiTime(value: string | null | undefined): string {
  return String(value || "").slice(0, 5);
}

function weeklyEventKey(slotIdx: number, patternDate: string) {
  return `wp:${slotIdx}:${patternDate}`;
}

function occurrenceEventKey(draftId: string) {
  return `occ:${draftId}`;
}

function nextOccurrenceDraftId() {
  return `new-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeInstructor(
  value: string | string[] | null | undefined,
): string | null {
  const first = instructorValue(value);
  return first || null;
}

function instructorsEqual(
  a: string | string[] | null | undefined,
  b: string | string[] | null | undefined,
) {
  return normalizeInstructor(a) === normalizeInstructor(b);
}

function timesEqual(
  a: string | null | undefined,
  b: string | null | undefined,
) {
  return toUiTime(a) === toUiTime(b);
}

function roomsEqual(
  a: string | null | undefined,
  b: string | null | undefined,
) {
  return String(a || "").trim() === String(b || "").trim();
}

export function expandWeeklySlotsToEvents({
  config,
  weeklySlots,
  audienceTokens,
}: {
  config: SchemaScheduleConfig;
  weeklySlots: SchemaWeeklyPatternSlot[];
  audienceTokens: string[];
}): EditableSessionEvent[] {
  const startingDay = config.term.starting_day ?? Weekday.MONDAY;
  const events: EditableSessionEvent[] = [];

  for (const [slotIdx, slot] of weeklySlots.entries()) {
    const weekday = weeklyPatternDayKey(String(slot.weekday));
    if (!weekday) continue;
    const window = resolveAudienceSemester(config, audienceTokens);
    if (window == null) continue;
    const dates = semesterDatesForWeekday(config, weekday, window);
    for (const patternDate of dates) {
      const resolved = resolveWeeklyMeetingFields(slot, patternDate, config);
      events.push({
        key: weeklyEventKey(slotIdx, patternDate),
        source: {
          kind: "weekly",
          slotIdx,
          patternDate,
          selectWeek: weekStartForDate(patternDate, startingDay),
        },
        date: String(resolved.date || patternDate).slice(0, 10),
        start_time: toApiTime(resolved.start),
        end_time: toApiTime(resolved.end),
        room: String(resolved.room || "").trim() || null,
        instructor: normalizeInstructor(resolved.instructors),
        cancelled: Boolean(resolved.cancelled),
      });
    }
  }

  return events.sort((a, b) => {
    const byDate = a.date.localeCompare(b.date);
    if (byDate !== 0) return byDate;
    return toUiTime(a.start_time).localeCompare(toUiTime(b.start_time));
  });
}

export function expandOccurrencesToEvents(
  occurrences: SchemaSessionOccurrence[],
): EditableSessionEvent[] {
  return occurrences.map((occurrence, occIdx) => {
    const draftId = `orig-${occIdx}`;
    return {
      key: occurrenceEventKey(draftId),
      source: {
        kind: "occurrence",
        draftId,
        occIdx,
      },
      date: String(occurrence.date || "").slice(0, 10),
      start_time: toApiTime(occurrence.start_time),
      end_time: toApiTime(occurrence.end_time),
      room: String(occurrence.room || "").trim() || null,
      instructor: normalizeInstructor(occurrence.instructor),
      cancelled: false,
    };
  });
}

export function createOccurrenceEvent(
  defaults?: Partial<EditableSessionEvent>,
): EditableSessionEvent {
  const draftId = nextOccurrenceDraftId();
  return {
    key: occurrenceEventKey(draftId),
    source: {
      kind: "occurrence",
      draftId,
      occIdx: null,
    },
    date: defaults?.date ?? "",
    start_time: defaults?.start_time ?? "09:00:00",
    end_time: defaults?.end_time ?? "10:30:00",
    room: defaults?.room ?? null,
    instructor: defaults?.instructor ?? null,
    cancelled: false,
  };
}

export function patchEditableEvents(
  events: EditableSessionEvent[],
  keys: Iterable<string>,
  patch: EditableSessionEventPatch,
): EditableSessionEvent[] {
  const selected = new Set(keys);
  return events.map((event) => {
    if (!selected.has(event.key)) return event;
    return {
      ...event,
      ...(patch.date !== undefined ? { date: patch.date } : null),
      ...(patch.start_time !== undefined
        ? { start_time: toApiTime(patch.start_time) }
        : null),
      ...(patch.end_time !== undefined
        ? { end_time: toApiTime(patch.end_time) }
        : null),
      ...(patch.room !== undefined
        ? { room: String(patch.room || "").trim() || null }
        : null),
      ...(patch.instructor !== undefined
        ? { instructor: normalizeInstructor(patch.instructor) }
        : null),
      ...(patch.cancelled !== undefined
        ? { cancelled: Boolean(patch.cancelled) }
        : null),
    };
  });
}

function weeklyEditIsNoOp(
  slot: SchemaWeeklyPatternSlot,
  patternDate: string,
  event: EditableSessionEvent,
): boolean {
  if (event.cancelled) return false;
  if (event.date !== patternDate) return false;
  if (!timesEqual(event.start_time, slot.start_time)) return false;
  if (!timesEqual(event.end_time, slot.end_time)) return false;
  if (!roomsEqual(event.room, slot.room)) return false;
  if (!instructorsEqual(event.instructor, slot.instructor)) return false;
  return true;
}

function buildWeeklyEditFromEvent(
  slot: SchemaWeeklyPatternSlot,
  event: EditableSessionEvent,
  startingDay: Weekday,
): SchemaWeeklyPatternSlotEdit | null {
  if (event.source.kind !== "weekly") return null;
  const patternDate = event.source.patternDate;
  const selectWeek = weekStartForDate(patternDate, startingDay);
  if (weeklyEditIsNoOp(slot, patternDate, event)) return null;

  const edit: SchemaWeeklyPatternSlotEdit = {
    select_week: selectWeek,
    cancel: Boolean(event.cancelled),
  };
  if (event.cancelled) return edit;

  if (event.date !== patternDate) edit.date = event.date;
  if (!timesEqual(event.start_time, slot.start_time)) {
    edit.start_time = toApiTime(event.start_time);
  }
  if (!timesEqual(event.end_time, slot.end_time)) {
    edit.end_time = toApiTime(event.end_time);
  }
  if (!roomsEqual(event.room, slot.room)) {
    edit.room = event.room;
  }
  if (!instructorsEqual(event.instructor, slot.instructor)) {
    edit.instructor = event.instructor;
  }
  return edit;
}

export function serializeWeeklyEventsToSlots({
  originalSlots,
  events,
  config,
}: {
  originalSlots: SchemaWeeklyPatternSlot[];
  events: EditableSessionEvent[];
  config: SchemaScheduleConfig;
}): SchemaWeeklyPatternSlot[] {
  const startingDay = config.term.starting_day ?? Weekday.MONDAY;
  const nextSlots = structuredClone(originalSlots);

  const eventsBySlot = new Map<number, EditableSessionEvent[]>();
  for (const event of events) {
    if (event.source.kind !== "weekly") continue;
    const list = eventsBySlot.get(event.source.slotIdx) ?? [];
    list.push(event);
    eventsBySlot.set(event.source.slotIdx, list);
  }

  for (const [slotIdx, slot] of nextSlots.entries()) {
    const slotEvents = eventsBySlot.get(slotIdx) ?? [];
    const touchedWeeks = new Set(
      slotEvents
        .filter((event) => event.source.kind === "weekly")
        .map((event) =>
          weekStartForDate(
            (
              event.source as Extract<
                EditableSessionEventSource,
                { kind: "weekly" }
              >
            ).patternDate,
            startingDay,
          ),
        ),
    );

    const byWeek = new Map<string, SchemaWeeklyPatternSlotEdit>();

    // Keep edits for weeks outside the expanded editor window.
    for (const edit of slot.edits || []) {
      const weekKey = weekStartForDate(edit.select_week, startingDay);
      if (touchedWeeks.has(weekKey)) continue;
      byWeek.set(weekKey, edit);
    }

    for (const event of slotEvents) {
      if (event.source.kind !== "weekly") continue;
      const edit = buildWeeklyEditFromEvent(slot, event, startingDay);
      if (!edit) continue;
      byWeek.set(weekStartForDate(edit.select_week, startingDay), edit);
    }

    slot.edits = byWeek.size ? [...byWeek.values()] : null;
  }

  return nextSlots;
}

export function serializeOccurrenceEvents(
  events: EditableSessionEvent[],
): SchemaSessionOccurrence[] {
  return events
    .filter((event) => event.source.kind === "occurrence" && !event.cancelled)
    .sort((a, b) => {
      const byDate = a.date.localeCompare(b.date);
      if (byDate !== 0) return byDate;
      return toUiTime(a.start_time).localeCompare(toUiTime(b.start_time));
    })
    .map((event) => ({
      date: event.date,
      start_time: toApiTime(event.start_time),
      end_time: toApiTime(event.end_time),
      room: event.room,
      instructor: event.instructor,
    }));
}

export function validateEditableEvents(
  events: EditableSessionEvent[],
): string | null {
  const active = events.filter((event) => !event.cancelled);
  if (!active.length) return "Добавьте хотя бы одно занятие.";
  for (const [index, event] of active.entries()) {
    if (!String(event.date || "").trim()) {
      return `Укажите дату для строки ${index + 1}.`;
    }
    if (!normalizeTypedHhmm(event.start_time).slice(0, 5)) {
      return `Укажите время для строки ${index + 1}.`;
    }
  }
  return null;
}

export function eventsEqual(
  a: EditableSessionEvent[],
  b: EditableSessionEvent[],
) {
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index += 1) {
    const left = a[index]!;
    const right = b[index]!;
    if (left.key !== right.key) return false;
    if (left.date !== right.date) return false;
    if (!timesEqual(left.start_time, right.start_time)) return false;
    if (!timesEqual(left.end_time, right.end_time)) return false;
    if (!roomsEqual(left.room, right.room)) return false;
    if (!instructorsEqual(left.instructor, right.instructor)) return false;
    if (Boolean(left.cancelled) !== Boolean(right.cancelled)) return false;
  }
  return true;
}

export function editableEventsToDraftMeetings({
  events,
  meeting,
  meetingRef,
  audienceTokens,
}: {
  events: EditableSessionEvent[];
  meeting: Meeting;
  meetingRef: MeetingRef;
  audienceTokens: string[];
}): Meeting[] {
  return events
    .filter((event) => !event.cancelled)
    .map((event, index) => {
      const instanceId = editableSessionEventInstanceId(
        event,
        meetingRef,
        index,
      );
      return {
        instance_id: instanceId,
        course: meeting.course,
        course_short_name: meeting.course_short_name,
        tag: meeting.tag,
        groups: audienceTokens,
        date: event.date,
        start: toUiTime(event.start_time),
        end: toUiTime(event.end_time) || undefined,
        room: String(event.room || "").trim(),
        instructors: event.instructor || "",
        instructor_pool: meeting.instructor_pool || [],
        section: meeting.section,
        pattern_date:
          event.source.kind === "weekly" ? event.source.patternDate : undefined,
        cancelled: false,
      } satisfies Meeting;
    });
}

export function editableSessionEventInstanceId(
  event: EditableSessionEvent,
  meetingRef: MeetingRef,
  fallbackIndex = 0,
): string {
  if (event.source.kind === "weekly") {
    return `${meetingRef.courseIdx}:${meetingRef.componentIdx}:${meetingRef.seriesIdx}:wp:${event.source.slotIdx}:${event.source.patternDate}`;
  }
  const occurrenceIndex = event.source.occIdx ?? fallbackIndex;
  return `${meetingRef.courseIdx}:${meetingRef.componentIdx}:${meetingRef.seriesIdx}:occ:${occurrenceIndex}`;
}

export function applyEditableEventsToCourse({
  course,
  meetingRef,
  config,
  audience,
  placement,
  weeklySlots,
  events,
}: {
  course: SchemaCourseConfig;
  meetingRef: MeetingRef;
  config: SchemaScheduleConfig;
  audience?: string[];
  placement: "weekly" | "dates_pattern";
  weeklySlots: SchemaWeeklyPatternSlot[];
  events: EditableSessionEvent[];
}): SchemaCourseConfig | null {
  if (placement === "weekly") {
    return applySeriesScheduleToCourse(course, meetingRef, config, {
      audience,
      weeklyPattern: serializeWeeklyEventsToSlots({
        originalSlots: weeklySlots,
        events,
        config,
      }),
      dates_pattern: null,
    });
  }

  return applySeriesScheduleToCourse(course, meetingRef, config, {
    audience,
    dates_pattern: serializeOccurrenceEvents(events),
    weeklyPattern: null,
  });
}

export function initialSelectedEventKey(
  meeting: Meeting | null,
  events: EditableSessionEvent[],
): string | null {
  if (!meeting) return events[0]?.key ?? null;
  const ref = parseMeetingInstanceId(meeting.instance_id);
  if (!ref) return events[0]?.key ?? null;

  if (ref.kind === "wp") {
    const patternDate = meeting.pattern_date || ref.date;
    const key = weeklyEventKey(ref.slotIdx, patternDate);
    if (events.some((event) => event.key === key)) return key;
  }

  if (ref.kind === "occ") {
    const byIdx = events.find(
      (event) =>
        event.source.kind === "occurrence" &&
        event.source.occIdx === ref.occIdx,
    );
    if (byIdx) return byIdx.key;
  }

  const byDate = events.find(
    (event) =>
      event.date === meeting.date &&
      toUiTime(event.start_time) === String(meeting.start || "").slice(0, 5),
  );
  return byDate?.key ?? events[0]?.key ?? null;
}

export function defaultEndForStart(
  config: SchemaScheduleConfig,
  start: string,
  audienceTokens: string[],
) {
  return resolveEndTimeForStart(config, start, audienceTokens);
}
