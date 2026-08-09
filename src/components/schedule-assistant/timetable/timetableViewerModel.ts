/** Port of schedule-assistant-viewer.html script (same behavior). */
import type {
  SchemaScheduleConfig,
  SchemaWeeklyPatternSlot,
  SchemaWeeklyPatternSlotEdit,
} from "@/api/schedule-assistant/types.ts";
import { Weekday } from "@/api/schedule-assistant/types.ts";
import { getScheduleSections } from "@/components/schedule-assistant/config/scheduleConfigUtils.ts";
import {
  expandStudentGroupSelectors,
  isStudentGroupSelector,
  parseStudentGroupSelector,
} from "@/components/schedule-assistant/config/studentGroupSelectors.ts";
import { normalizeTracksFromSectionProgram } from "@/components/schedule-assistant/settings/groups/normalizeTrackFromSectionProgram.ts";
import {
  buildGroupToProgramMap,
  findProgramByNameOrCode,
  isMeetingOnSlot,
  nearestSlotStart,
  normalizeHhmm,
  programResolvedTimeSlots,
  resolveProgramTimeColumns,
  termResolvedTimeSlots,
  toMinutes as slotToMinutes,
  unionResolvedTimeSlots,
  type ResolvedTimeSlot,
} from "./programTimeSlots.ts";

export const DAY_NAMES = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const;

/** Полные подписи дней для строк таблицы. */
export const WEEKDAY_LABEL_RU: Record<(typeof DAY_NAMES)[number], string> = {
  Mon: "Понедельник",
  Tue: "Вторник",
  Wed: "Среда",
  Thu: "Четверг",
  Fri: "Пятница",
  Sat: "Суббота",
  Sun: "Воскресенье",
};

export function weekdayLabelRu(day: string) {
  return WEEKDAY_LABEL_RU[day as (typeof DAY_NAMES)[number]] ?? day;
}

/** «Каждый понедельник» / «Каждую субботу» / «Каждое воскресенье». */
const EVERY_WEEKDAY_PHRASE_RU: Record<(typeof DAY_NAMES)[number], string> = {
  Mon: "Каждый понедельник",
  Tue: "Каждый вторник",
  Wed: "Каждую среду",
  Thu: "Каждый четверг",
  Fri: "Каждую пятницу",
  Sat: "Каждую субботу",
  Sun: "Каждое воскресенье",
};

export function everyWeekdayPhraseRu(day: string) {
  return (
    EVERY_WEEKDAY_PHRASE_RU[day as (typeof DAY_NAMES)[number]] ??
    `Каждый ${weekdayLabelRu(day).toLowerCase()}`
  );
}

/** Один источник текстов `title` для таблицы и для HTML панели деталей. */
export const scheduleAssistantDetailTooltips = {
  room: "Показать локацию в панели деталей",
  instructor: "Показать преподавателя в панели деталей",
  group: "Показать группу в панели деталей",
  program: "Показать программу в панели деталей",
  resource: "Показать в панели деталей",
} as const;

export function instructorDetailTooltip(name: string) {
  return `Показать преподавателя «${name}» в панели деталей`;
}

/** Table UI: English name, else Russian, else alias/email/id. */
export function buildInstructorLabelById(
  config: SchemaScheduleConfig,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const instructor of config.instructors ?? []) {
    const id = String(instructor.id || "").trim();
    if (!id) continue;
    const label =
      instructor.name_en?.trim() ||
      instructor.name_ru?.trim() ||
      instructor.alias?.trim() ||
      instructor.email?.trim() ||
      id;
    out[id] = label;
    const email = instructor.email?.trim();
    if (email && !(email in out)) out[email] = label;
  }
  return out;
}

export function resolveInstructorLabel(
  instructorId: string,
  labelById: Record<string, string>,
): string {
  return labelById[instructorId] || instructorId;
}

export type MeetingOverrideField = "room" | "time" | "weekday" | "instructor";

export type Meeting = {
  instance_id: string;
  course: string;
  /** Short English display name from course config. */
  course_short_name?: string;
  tag: string;
  groups: string[];
  date: string;
  start: string;
  /** Meeting end time (HH:MM) when known. */
  end?: string;
  room: string;
  instructors: string | string[];
  /** Copied from component; used in detail panel. */
  instructor_pool: unknown[];
  sections: string[];
  /** Canonical weekly-pattern date before edit.date override. */
  pattern_date?: string;
  /** Fields that differ from the recurring weekly pattern base. */
  override_fields?: MeetingOverrideField[];
  /** Weekly-pattern occurrence cancelled via edit.cancel. */
  cancelled?: boolean;
  /** True when start/end are not on a configured program/term slot. */
  off_grid?: boolean;
  /** Minutes offset from the grid row slot start (for off-grid rendering). */
  off_grid_offset_minutes?: number;
};

export type Column = {
  yearLabel: string;
  groupId: string;
  groupLabel: string;
  /** SectionProgram.code when known. */
  programCode?: string;
};

export type WeekRange = { key: string; start: string; end: string };

export type BuiltGrid = {
  allowedDays: string[];
  slots: { start: string; end: string; label: string }[];
  /** Per program-name (yearLabel): slots used for that program's time column labels. */
  slotsByProgramLabel: Record<
    string,
    { start: string; end: string; label: string }[]
  >;
  /** True when program slots differ from term.time_slots (needs sticky time subcolumn). */
  showProgramTimeColumn: Record<string, boolean>;
  map: Map<string, Meeting[]>;
  weekMeetings: Meeting[];
  backToBackSources: Set<string>;
  backToBackTargets: Set<string>;
  tabMode: string;
};

export type Selection =
  | null
  | {
      type: "meeting";
      value: string;
      course: string;
      /** Component tag whose meetings get related highlight; defaults to selected meeting tag. */
      focusTag?: string;
    }
  | { type: "program"; value: string }
  | { type: "group"; value: string }
  | { type: "instructor"; value: string }
  | { type: "room"; value: string };

export function dayKey(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  return DAY_NAMES[d.getDay() === 0 ? 6 : d.getDay() - 1];
}

const WEEKLY_PATTERN_DAY_TO_KEY: Record<string, (typeof DAY_NAMES)[number]> = {
  monday: "Mon",
  mon: "Mon",
  tuesday: "Tue",
  tue: "Tue",
  wednesday: "Wed",
  wed: "Wed",
  thursday: "Thu",
  thu: "Thu",
  friday: "Fri",
  fri: "Fri",
  saturday: "Sat",
  sat: "Sat",
  sunday: "Sun",
  sun: "Sun",
};

export function weeklyPatternDayKey(day: string) {
  const raw = String(day || "").trim();
  if (!raw) return null;
  const lowered = raw.toLowerCase();
  if (WEEKLY_PATTERN_DAY_TO_KEY[lowered])
    return WEEKLY_PATTERN_DAY_TO_KEY[lowered];
  if ((DAY_NAMES as readonly string[]).includes(raw))
    return raw as (typeof DAY_NAMES)[number];
  return null;
}

function normalizedTermDaySet(config: SchemaScheduleConfig) {
  const allowed = new Set<(typeof DAY_NAMES)[number]>();
  for (const day of config.term.days || []) {
    const key = weeklyPatternDayKey(String(day));
    if (key) allowed.add(key);
  }
  return allowed;
}

export function normalizedTermDays(config: SchemaScheduleConfig) {
  return DAY_NAMES.filter((day) => normalizedTermDaySet(config).has(day));
}

function formatLocalDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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

export function weekStartForDate(
  dateStr: string,
  startingDay: Weekday = Weekday.MONDAY,
) {
  const dt = new Date(`${dateStr}T00:00:00`);
  const startIdx = WEEKDAY_TO_JS_INDEX[startingDay] ?? 0;
  const dayIdx = (dt.getDay() + 6) % 7;
  const diff = (dayIdx - startIdx + 7) % 7;
  const result = new Date(dt);
  result.setDate(dt.getDate() - diff);
  return formatLocalDate(result);
}

export function findEditForMeetingDate(
  date: string,
  edits: SchemaWeeklyPatternSlotEdit[] | null | undefined,
  startingDay: Weekday,
) {
  if (!edits?.length) return undefined;
  const weekKey = weekStartForDate(date, startingDay);
  return edits.find(
    (edit) => weekStartForDate(edit.select_week, startingDay) === weekKey,
  );
}

function instructorKey(value: string | string[] | null | undefined) {
  const list = typeof value === "string" ? [value] : value || [];
  return list
    .map((item) => String(item).trim())
    .filter(Boolean)
    .join("\0");
}

function dateOnly(value: string | null | undefined) {
  return String(value || "").slice(0, 10);
}

function timeKey(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .slice(0, 5);
}

export function weeklyMeetingOverrideFields(
  slot: SchemaWeeklyPatternSlot,
  patternDate: string,
  config: SchemaScheduleConfig,
): MeetingOverrideField[] {
  const resolved = resolveWeeklyMeetingFields(slot, patternDate, config);
  if (resolved.cancelled) return [];

  const fields: MeetingOverrideField[] = [];
  const baseStart = timeKey(slot.start_time);
  const baseRoom = String(slot.room ?? "").trim();
  const baseInstructor = instructorKey(slot.instructor);

  const resolvedStart = timeKey(resolved.start);
  const resolvedRoom = String(resolved.room ?? "").trim();
  const resolvedInstructor = instructorKey(resolved.instructors);

  if (dateOnly(resolved.date) !== dateOnly(patternDate)) {
    fields.push("weekday");
  }
  if (resolvedStart !== baseStart) {
    fields.push("time");
  }
  if (resolvedRoom !== baseRoom) {
    fields.push("room");
  }
  if (resolvedInstructor !== baseInstructor) {
    fields.push("instructor");
  }

  return fields;
}

export function resolveWeeklyMeetingFields(
  slot: SchemaWeeklyPatternSlot,
  date: string,
  config: SchemaScheduleConfig,
) {
  const startingDay = config.term.starting_day ?? Weekday.MONDAY;
  const edit = findEditForMeetingDate(date, slot.edits, startingDay);
  if (edit?.cancel) {
    return {
      date,
      start: String(slot.start_time).slice(0, 5),
      end: String(slot.end_time).slice(0, 5),
      room: slot.room ?? "",
      instructors: slot.instructor ?? "",
      cancelled: true,
    };
  }

  const resolvedDate = edit?.date ?? date;
  const resolvedStart = edit?.start_time
    ? String(edit.start_time).slice(0, 5)
    : String(slot.start_time).slice(0, 5);
  const resolvedEnd = edit?.end_time
    ? String(edit.end_time).slice(0, 5)
    : String(slot.end_time).slice(0, 5);
  const resolvedRoom =
    edit?.room !== undefined && edit?.room !== null
      ? edit.room
      : (slot.room ?? "");
  const resolvedInstructor =
    edit?.instructor !== undefined && edit?.instructor !== null
      ? edit.instructor
      : (slot.instructor ?? "");

  return {
    date: resolvedDate,
    start: resolvedStart,
    end: resolvedEnd,
    room: resolvedRoom || "",
    instructors: resolvedInstructor,
    cancelled: false,
  };
}

export function weekStartMondayIso(dateStr: string) {
  const dt = new Date(`${dateStr}T00:00:00`);
  const monday = new Date(dt);
  const day = (dt.getDay() + 6) % 7;
  monday.setDate(dt.getDate() - day);
  return formatLocalDate(monday);
}

export function semesterDatesForWeekday(
  config: SchemaScheduleConfig,
  weekday: (typeof DAY_NAMES)[number],
) {
  const semester = config.term.semester;
  if (!semester.start_date || !semester.end_date) return [];
  const allowed = normalizedTermDaySet(config);
  if (!allowed.has(weekday)) return [];
  const out: string[] = [];
  const cur = new Date(`${semester.start_date}T00:00:00`);
  const end = new Date(`${semester.end_date}T00:00:00`);
  while (cur <= end) {
    const iso = formatLocalDate(cur);
    if (dayKey(iso) === weekday) out.push(iso);
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function toMinutes(timeStr: string) {
  const [h, m] = String(timeStr).split(":").map(Number);
  return h * 60 + m;
}

export function add90m(timeStr: string) {
  const total = toMinutes(timeStr) + 90;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function uniqueSorted<T>(arr: T[]) {
  return Array.from(new Set(arr)).sort() as T[];
}

export function hashString(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return h >>> 0;
}

/** Одинаковая палитра для одного курса (trim, пустое → «—»). */
export function courseColorKey(course: string | undefined | null): string {
  const t = String(course ?? "").trim();
  return t || "—";
}

export function buildCourseColors(meetings: Meeting[]) {
  const subjects = Array.from(
    new Set((meetings || []).map((m) => courseColorKey(m.course))),
  ).sort();
  const out: Record<string, { bg: string; border: string }> = {};
  const GOLDEN_HUE_STEP = 137.508;
  for (const subject of subjects) {
    const hue = (hashString(subject) * GOLDEN_HUE_STEP) % 360;
    const mix = hashString(`${subject}\0sat`);
    const s = 64 + (mix % 4) * 9;
    const l = 78 + ((mix >>> 3) % 5) * 3.2;
    const borderS = Math.min(96, s + 8);
    const borderL = Math.max(34, l - 28);
    out[subject] = {
      bg: `hsl(${hue.toFixed(2)}, ${s}%, ${l.toFixed(1)}%)`,
      border: `hsl(${hue.toFixed(2)}, ${borderS}%, ${borderL}%)`,
    };
  }
  return out;
}

export function colorBySubject(
  subject: string,
  courseColors: Record<string, { bg: string; border: string }>,
) {
  const key = courseColorKey(subject);
  if (courseColors && courseColors[key]) return courseColors[key];
  const h = hashString(key) % 360;
  return {
    bg: `hsl(${h}, 76%, 82%)`,
    border: `hsl(${h}, 82%, 48%)`,
  };
}

export function meetingSelectionKey(m: Meeting) {
  return m.instance_id;
}

export function signatureMeeting(m: Meeting) {
  const inst = (
    typeof m.instructors === "string" ? [m.instructors] : m.instructors
  ).join("|");
  const groups = (m.groups || []).slice().sort().join("|");
  return `${m.course}|${m.tag}|${m.date}|${m.start}|${groups}|${inst}|${m.room || "-"}`;
}

export type MergedRow = { sign: string; sample: Meeting; count: number };

export function mergedMeetingsForCell(meetings: Meeting[] | undefined) {
  const merged = new Map<string, MergedRow>();
  for (const m of meetings || []) {
    const sign = signatureMeeting(m);
    const row = merged.get(sign) || { sign, sample: m, count: 0 };
    row.count += 1;
    merged.set(sign, row);
  }
  return Array.from(merged.values()).sort((a, b) =>
    a.sign.localeCompare(b.sign),
  );
}

export function cellSignature(mergedRows: MergedRow[]) {
  if (!mergedRows.length) return "";
  return mergedRows.map((r) => `${r.sign}#${r.count}`).join("||");
}

export function buildGroupMeta(config: SchemaScheduleConfig) {
  const groupNames: Record<string, string> = {};
  const byProgram: Record<string, Set<string>> = {};
  const programCodeByLabel: Record<string, string> = {};
  for (const section of getScheduleSections(config)) {
    for (const program of section.programs) {
      const yearLabel = program.name || section.code;
      const programCode = String(program.code || "").trim();
      if (programCode) programCodeByLabel[yearLabel] = programCode;
      if (!byProgram[yearLabel]) byProgram[yearLabel] = new Set();
      for (const tr of normalizeTracksFromSectionProgram(program)) {
        for (const g of tr.groups || []) {
          byProgram[yearLabel].add(g);
        }
      }
    }
  }
  for (const g of config.students_groups ?? []) {
    const code = g.code;
    if (!code) continue;
    groupNames[code] = g.name || code;
  }
  return { groupNames, byProgram, programCodeByLabel };
}

export function buildRoomCapacityMap(config: SchemaScheduleConfig) {
  const out: Record<string, number> = {};
  for (const r of config.rooms ?? []) {
    if (r.capacity == null) continue;
    out[r.id] = r.capacity;
  }
  return out;
}

export function buildGroupSizeMap(config: SchemaScheduleConfig) {
  const out: Record<string, number | null> = {};
  for (const g of config.students_groups ?? []) {
    out[g.code] = Number.isFinite(g.estimated_size) ? g.estimated_size! : null;
  }
  return out;
}

export function meetingStudentCount(
  m: Meeting,
  groupSizeById: Record<string, number | null | undefined>,
) {
  return (m.groups || []).reduce((acc, gid) => {
    const n = groupSizeById?.[gid];
    return acc + (Number.isFinite(n as number) ? (n as number) : 0);
  }, 0);
}

/** Same text as in TimetableWorkspace meeting card room line: `ROOM (students / capacity)`. */
export function meetingRoomLoadLabel(
  m: Meeting,
  roomCapacityById: Record<string, number | undefined>,
  groupSizeById: Record<string, number | null | undefined>,
) {
  const students = meetingStudentCount(m, groupSizeById);
  const cap = roomCapacityById?.[m.room];
  return `${m.room || "-"} (${students} / ${cap ?? "-"})`;
}

export function meetingRoomLoadOverCapacity(
  m: Meeting,
  roomCapacityById: Record<string, number | undefined>,
  groupSizeById: Record<string, number | null | undefined>,
) {
  const students = meetingStudentCount(m, groupSizeById);
  const cap = roomCapacityById?.[m.room];
  return Number.isFinite(cap) && students > (cap as number);
}

export function buildSectionGroupSets(config: SchemaScheduleConfig) {
  const out: Record<string, Set<string>> = {};
  for (const section of getScheduleSections(config)) {
    const sectionCode = String(section.code || "").trim();
    if (!sectionCode) continue;
    const groups = new Set<string>();
    for (const program of section.programs || []) {
      for (const track of normalizeTracksFromSectionProgram(program)) {
        for (const group of track.groups || []) {
          groups.add(String(group));
        }
      }
    }
    out[sectionCode] = groups;
  }
  return out;
}

function sessionAudienceTokens(
  component: { student_groups?: string[] },
  series: { audience?: string[] },
): string[] {
  const audience = series.audience || [];
  if (audience.length) return audience;
  return component.student_groups || [];
}

function meetingMatchesSectionTab(
  meeting: Meeting,
  tabMode: string,
  sectionGroupSets: Record<string, Set<string>>,
) {
  const sectionGroups = sectionGroupSets[tabMode];
  if (sectionGroups?.size) {
    if ((meeting.groups || []).some((groupId) => sectionGroups.has(groupId))) {
      return true;
    }
  }
  return (meeting.sections || []).includes(tabMode);
}

export function filterMeetingsByTab(
  meetings: Meeting[],
  tabMode: string,
  config?: SchemaScheduleConfig | null,
) {
  if (tabMode === "instructor" || tabMode === "room" || tabMode === "all") {
    return meetings;
  }
  if (!config) {
    return meetings.filter((m) => m.sections.includes(tabMode));
  }
  const sectionGroupSets = buildSectionGroupSets(config);
  return meetings.filter((m) =>
    meetingMatchesSectionTab(m, tabMode, sectionGroupSets),
  );
}

export function roomFillPercent(
  meeting: Meeting,
  roomCapacityById: Record<string, number | undefined>,
  groupSizeById: Record<string, number | null | undefined>,
) {
  const capacity = roomCapacityById?.[meeting.room];
  const students = meetingStudentCount(meeting, groupSizeById);
  if (!Number.isFinite(capacity) || (capacity as number) <= 0) return "-";
  return `${Math.round((students / (capacity as number)) * 100)}%`;
}

export function buildColumns(config: SchemaScheduleConfig) {
  const meta = buildGroupMeta(config);
  const usedGroups = new Set<string>();
  for (const course of config.courses ?? []) {
    for (const comp of course.components || []) {
      for (const session of comp.sessions || []) {
        for (const groupId of expandStudentGroupSelectors(
          config,
          sessionAudienceTokens(comp, session),
        )) {
          usedGroups.add(groupId);
        }
      }
      if (!comp.sessions?.length) {
        for (const groupId of expandStudentGroupSelectors(
          config,
          comp.student_groups || [],
        )) {
          usedGroups.add(groupId);
        }
      }
    }
  }

  const columns: Column[] = [];
  const known = new Set<string>();
  for (const section of getScheduleSections(config)) {
    for (const program of section.programs || []) {
      const yearLabel = program.name || section.code;
      const programCode =
        String(program.code || "").trim() ||
        meta.programCodeByLabel[yearLabel] ||
        undefined;
      for (const track of normalizeTracksFromSectionProgram(program)) {
        for (const gid of track.groups || []) {
          if (!usedGroups.has(gid) || known.has(gid)) continue;
          columns.push({
            yearLabel,
            groupId: gid,
            groupLabel: meta.groupNames[gid] || gid,
            programCode,
          });
          known.add(gid);
        }
      }
    }
  }
  for (const gid of Array.from(usedGroups).sort()) {
    if (known.has(gid)) continue;
    columns.push({
      yearLabel: "Other",
      groupId: gid,
      groupLabel: meta.groupNames[gid] || gid,
    });
  }
  return columns;
}

function meetingCourseFields(course: {
  name: string;
  short_name?: string | null;
}) {
  const shortName = String(course.short_name ?? "").trim();
  return {
    course: course.name,
    course_short_name: shortName || undefined,
  };
}

export function buildMeetings(
  config: SchemaScheduleConfig,
  coursesToSections: { [key: string]: string[] },
) {
  const flat: Meeting[] = [];
  for (const [courseIdx, course] of (config.courses ?? []).entries()) {
    for (const [componentIdx, component] of (
      course.components || []
    ).entries()) {
      for (const [seriesIdx, series] of (component.sessions || []).entries()) {
        const audienceGroups = expandStudentGroupSelectors(
          config,
          sessionAudienceTokens(component, series),
        );

        for (const [occIdx, occurrence] of (
          series.occurrences || []
        ).entries()) {
          if (!occurrence.date || !occurrence.start_time) continue;
          flat.push({
            instance_id: `${courseIdx}:${componentIdx}:${seriesIdx}:occ:${occIdx}`,
            ...meetingCourseFields(course),
            tag: component.tag,
            groups: audienceGroups,
            date: occurrence.date,
            start: String(occurrence.start_time).slice(0, 5),
            end: occurrence.end_time
              ? String(occurrence.end_time).slice(0, 5)
              : undefined,
            room: occurrence.room ?? "",
            instructors: occurrence.instructor ?? "",
            instructor_pool: component.instructor_pool,
            sections: coursesToSections[courseIdx] ?? [],
          });
        }

        const pattern = series.weekly_pattern || [];
        if (pattern.length > 0) {
          for (const [slotIdx, slot] of pattern.entries()) {
            const weekday = weeklyPatternDayKey(String(slot.weekday ?? ""));
            if (!weekday) continue;
            for (const date of semesterDatesForWeekday(config, weekday)) {
              const resolved = resolveWeeklyMeetingFields(slot, date, config);
              if (resolved.cancelled) {
                flat.push({
                  instance_id: `${courseIdx}:${componentIdx}:${seriesIdx}:wp:${slotIdx}:${date}`,
                  ...meetingCourseFields(course),
                  tag: component.tag,
                  groups: audienceGroups,
                  date: resolved.date,
                  start: resolved.start,
                  end: resolved.end,
                  room: resolved.room,
                  instructors: resolved.instructors,
                  instructor_pool: component.instructor_pool,
                  sections: coursesToSections[courseIdx] ?? [],
                  pattern_date: date,
                  cancelled: true,
                });
                continue;
              }
              const overrideFields = weeklyMeetingOverrideFields(
                slot,
                date,
                config,
              );
              flat.push({
                instance_id: `${courseIdx}:${componentIdx}:${seriesIdx}:wp:${slotIdx}:${date}`,
                ...meetingCourseFields(course),
                tag: component.tag,
                groups: audienceGroups,
                date: resolved.date,
                start: resolved.start,
                end: resolved.end,
                room: resolved.room,
                instructors: resolved.instructors,
                instructor_pool: component.instructor_pool,
                sections: coursesToSections[courseIdx] ?? [],
                pattern_date: date,
                override_fields: overrideFields.length
                  ? overrideFields
                  : undefined,
              });
            }
          }
        }
      }
    }
  }
  return flat;
}

type SectionLookupMaps = {
  programToSection: Record<string, string>;
  groupsToSections: Record<string, string>;
};

function buildSectionLookupMaps(
  config: SchemaScheduleConfig,
): SectionLookupMaps {
  const programToSection: Record<string, string> = {};
  const groupsToSections: Record<string, string> = {};

  for (const section of getScheduleSections(config)) {
    const sectionCode = String(section.code || "").trim();
    if (!sectionCode) continue;
    for (const program of section.programs || []) {
      const programCode = String(program.code || "").trim();
      if (programCode) programToSection[programCode] = sectionCode;
      for (const track of normalizeTracksFromSectionProgram(program)) {
        for (const group of track.groups || []) {
          groupsToSections[String(group)] = sectionCode;
        }
      }
    }
  }

  return { programToSection, groupsToSections };
}

function resolveAudienceTokenToSection(
  token: string,
  maps: SectionLookupMaps,
): string | null {
  const raw = String(token || "").trim();
  if (!raw) return null;

  const parsed = parseStudentGroupSelector(raw);
  if (parsed) return maps.programToSection[parsed.programCode] ?? null;
  if (isStudentGroupSelector(raw)) return null;

  return maps.groupsToSections[raw] ?? null;
}

export function buildCoursesToSections(config: SchemaScheduleConfig) {
  const maps = buildSectionLookupMaps(config);
  const coursesToSections: Record<string, string[]> = {};

  for (const [courseIdx, course] of (config.courses ?? []).entries()) {
    const courseSections = new Set<string>();

    for (const component of course.components || []) {
      const tokens = [
        ...(component.student_groups || []),
        ...(component.sessions || []).flatMap(
          (session) => session.audience || [],
        ),
      ];
      for (const token of tokens) {
        const sectionCode = resolveAudienceTokenToSection(token, maps);
        if (sectionCode) courseSections.add(sectionCode);
      }
      for (const groupId of expandStudentGroupSelectors(config, tokens)) {
        const sectionCode = maps.groupsToSections[groupId];
        if (sectionCode) courseSections.add(sectionCode);
      }
    }

    coursesToSections[courseIdx] = Array.from(courseSections);
  }

  return coursesToSections;
}

export function buildWeeks(meetings: Meeting[]) {
  const dates = uniqueSorted(meetings.map((m) => m.date));
  const byWeek: Record<string, string[]> = {};
  for (const d of dates) {
    const monStr = weekStartMondayIso(d);
    if (!byWeek[monStr]) byWeek[monStr] = [];
    byWeek[monStr].push(d);
  }
  return Object.keys(byWeek)
    .sort()
    .map((mon) => ({
      key: mon,
      start: mon,
      end: byWeek[mon].sort().at(-1)!,
    }));
}

export function todayIsoDate() {
  return formatLocalDate(new Date());
}

export function weekIndexForDate(weeks: WeekRange[], dateStr: string) {
  if (!weeks.length) return 0;
  const date = String(dateStr).slice(0, 10);

  const containingIndex = weeks.findIndex(
    (week) => date >= week.start && date <= week.end,
  );
  if (containingIndex >= 0) return containingIndex;

  const weekStart = weekStartMondayIso(date);
  const weekStartIndex = weeks.findIndex((week) => week.start === weekStart);
  if (weekStartIndex >= 0) return weekStartIndex;

  if (date < weeks[0]!.start) return 0;

  const lastIndex = weeks.length - 1;
  if (date > weeks[lastIndex]!.end) return lastIndex;

  let bestIndex = 0;
  for (let i = 0; i < weeks.length; i++) {
    if (weeks[i]!.start <= date) bestIndex = i;
    else break;
  }
  return bestIndex;
}

export type WeekRelativePosition = "current" | "past" | "future";

export const WEEK_RELATIVE_LABELS: Record<WeekRelativePosition, string> = {
  current: "текущая",
  past: "прошлая",
  future: "будущая",
};

export const WEEK_RELATIVE_BADGE_CLASS: Record<WeekRelativePosition, string> = {
  current: "badge-success",
  past: "badge-error",
  future: "badge-info",
};

export function weekRelativeToToday(
  week: WeekRange,
  dateStr: string = todayIsoDate(),
): WeekRelativePosition {
  const date = String(dateStr).slice(0, 10);
  if (date >= week.start && date <= week.end) return "current";
  if (date < week.start) return "future";
  return "past";
}

export function buildGrid(
  config: SchemaScheduleConfig,
  allMeetings: Meeting[],
  weekStart: string,
  tabMode: string,
  visibleColumns?: Column[],
): BuiltGrid {
  const meetings = filterMeetingsByTab(allMeetings, tabMode, config).filter(
    (m) => {
      if (m.cancelled) return false;
      return weekStartMondayIso(m.date) === weekStart;
    },
  );

  const allowedDays = normalizedTermDays(config);
  const termSlots = termResolvedTimeSlots(config);
  const groupToProgram = buildGroupToProgramMap(config);

  const programLabels = new Set<string>();
  for (const col of visibleColumns || []) {
    if (col.yearLabel) programLabels.add(col.yearLabel);
  }
  if (!programLabels.size) {
    for (const m of meetings) {
      for (const gid of m.groups || []) {
        const program = groupToProgram.get(gid);
        if (program?.name) programLabels.add(program.name);
        else if (program?.code) programLabels.add(program.code);
      }
    }
  }

  const slotsByProgramLabel: Record<string, ResolvedTimeSlot[]> = {};
  const slotLists: ResolvedTimeSlot[][] = [];
  const orderedLabels = visibleColumns?.length
    ? [
        ...new Set(
          visibleColumns
            .map((col) => col.yearLabel)
            .filter((label): label is string => !!label),
        ),
      ]
    : [...programLabels];
  for (const label of orderedLabels) {
    const program = findProgramByNameOrCode(config, label);
    const slots = programResolvedTimeSlots(program, termSlots);
    slotsByProgramLabel[label] = slots;
    slotLists.push(slots);
  }
  // Extra time column only when slots are incompatible with the nearest time
  // column to the left (subset/superset share one column and merge to union).
  const { showProgramTimeColumn } = resolveProgramTimeColumns(
    orderedLabels,
    slotsByProgramLabel,
    termSlots,
  );
  if (!slotLists.length) slotLists.push(termSlots);

  // Shared row axis is always term.time_slots. Custom program times (e.g. 09:10)
  // attach to the nearest term row as off-grid instead of inventing extra rows.
  const slots = termSlots.length
    ? termSlots
    : unionResolvedTimeSlots(slotLists);
  const slotByStart = new Map(slots.map((slot) => [slot.start, slot]));

  const map = new Map<string, Meeting[]>();
  const backToBackSources = new Set<string>();
  const backToBackTargets = new Set<string>();

  for (const m of meetings) {
    const d = dayKey(m.date);
    const start = normalizeHhmm(m.start);
    const end = m.end ? normalizeHhmm(m.end) : undefined;
    for (const g of m.groups) {
      const program = groupToProgram.get(g);
      const programLabel = String(program?.name || program?.code || "").trim();
      const programSlots =
        (programLabel && slotsByProgramLabel[programLabel]) ||
        programResolvedTimeSlots(program, termSlots);
      const programSlotByStart = new Map(
        programSlots.map((slot) => [slot.start, slot]),
      );
      const exactProgramSlot = programSlotByStart.get(start);
      const onProgramSlot = exactProgramSlot
        ? isMeetingOnSlot(start, end, exactProgramSlot)
        : false;
      const onTermRow = slotByStart.has(start);
      let rowStart = start;
      let offGrid = false;
      let offsetMinutes = 0;
      if (onProgramSlot && onTermRow) {
        rowStart = start;
      } else if (onProgramSlot) {
        // Matches program slot but not term row — snap to nearest term row,
        // no custom-time caption (time equals program timeslot).
        const nearest = nearestSlotStart(start, slots);
        rowStart = nearest || start;
      } else {
        const nearest =
          nearestSlotStart(start, slots) ||
          nearestSlotStart(start, programSlots);
        if (nearest) {
          rowStart = nearest;
          offGrid = true;
          offsetMinutes = slotToMinutes(start) - slotToMinutes(nearest);
        } else {
          offGrid = true;
        }
      }
      const placed: Meeting = {
        ...m,
        start,
        end,
        off_grid: offGrid || undefined,
        off_grid_offset_minutes: offGrid ? offsetMinutes : undefined,
      };
      const k = `${d}|${rowStart}|${g}`;
      const current = map.get(k) || [];
      current.push(placed);
      map.set(k, current);
    }
  }

  const slotIndexByStart: Record<string, number> = {};
  slots.forEach((s, i) => {
    slotIndexByStart[s.start] = i;
  });
  const byDayCourse = new Map<string, Meeting[]>();
  for (const m of meetings) {
    const key = `${m.date}|${m.course}`;
    const arr = byDayCourse.get(key) || [];
    arr.push(m);
    byDayCourse.set(key, arr);
  }
  for (const arr of byDayCourse.values()) {
    const lecs = arr.filter((m) => String(m.tag).toLowerCase() === "lec");
    const tuts = arr.filter((m) => String(m.tag).toLowerCase() === "tut");
    for (const lec of lecs) {
      const lecIdx = slotIndexByStart[String(lec.start).slice(0, 5)];
      if (!Number.isFinite(lecIdx)) continue;
      for (const tut of tuts) {
        const tutIdx = slotIndexByStart[String(tut.start).slice(0, 5)];
        if (!Number.isFinite(tutIdx) || tutIdx !== lecIdx + 1) continue;
        const lecGroups = new Set(lec.groups || []);
        const shareAudience = (tut.groups || []).some((g) => lecGroups.has(g));
        if (!shareAudience) continue;
        backToBackSources.add(lec.instance_id);
        backToBackTargets.add(tut.instance_id);
      }
    }
  }

  return {
    allowedDays,
    slots,
    slotsByProgramLabel,
    showProgramTimeColumn,
    map,
    weekMeetings: meetings,
    backToBackSources,
    backToBackTargets,
    tabMode,
  };
}

export function columnsForTab(
  tabMode: string,
  baseColumns: Column[],
  allMeetings: Meeting[],
  config: SchemaScheduleConfig,
): Column[] {
  if (!baseColumns.length) return [];
  if (tabMode === "instructor" || tabMode === "room") return baseColumns;
  const tabMeetings = filterMeetingsByTab(allMeetings, tabMode, config);
  const usedGroups = new Set<string>();
  for (const m of tabMeetings) {
    for (const g of m.groups || []) usedGroups.add(g);
  }
  let sectionColumns = baseColumns.filter((c) => usedGroups.has(c.groupId));
  if (!sectionColumns.length) {
    const sectionGroups = buildSectionGroupSets(config)[tabMode];
    if (sectionGroups?.size) {
      sectionColumns = baseColumns.filter((c) => sectionGroups.has(c.groupId));
    }
  }
  if (tabMode === "english") {
    const normalizeEnglishTrackLabel = (trackName: string, groupId: string) => {
      const t = String(trackName || "")
        .trim()
        .toLowerCase();
      const gid = String(groupId || "")
        .trim()
        .toLowerCase();
      if (t.startsWith("awa") || gid.startsWith("eng-awa")) return "AWA";
      if (t.startsWith("eap") || gid.startsWith("eng-eap")) return "EAP";
      if (t === "fl" || t.startsWith("fl ") || gid.startsWith("eng-fl"))
        return "FL";
      return "FL";
    };
    const byId: Record<string, Column> = {};
    for (const col of baseColumns) byId[col.groupId] = col;
    const englishPrograms =
      getScheduleSections(config).find((section) => section.code === "english")
        ?.programs ?? [];
    const ordered: Column[] = [];
    const seen = new Set<string>();
    for (const program of englishPrograms) {
      for (const track of normalizeTracksFromSectionProgram(program)) {
        const trackLabel = normalizeEnglishTrackLabel(track?.name || "", "");
        for (const gid of track?.groups || []) {
          if (!usedGroups.has(gid) || seen.has(gid)) continue;
          const base = byId[gid];
          const baseGroupLabel = base?.groupLabel || gid;
          ordered.push({
            yearLabel: trackLabel,
            groupId: gid,
            groupLabel: baseGroupLabel,
            programCode:
              base?.programCode ||
              String(program.code || "").trim() ||
              undefined,
          });
          seen.add(gid);
        }
      }
    }
    for (const gid of Array.from(usedGroups).sort()) {
      if (seen.has(gid)) continue;
      const base = byId[gid];
      const trackLabel = normalizeEnglishTrackLabel("", gid);
      ordered.push({
        yearLabel: trackLabel,
        groupId: gid,
        groupLabel: base?.groupLabel || gid,
        programCode: base?.programCode,
      });
    }
    return ordered;
  }
  return sectionColumns;
}
