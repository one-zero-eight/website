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

export const DAY_NAMES = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const;

/** Короткие подписи дней для UI (гистограммы и т.п.). */
const DAY_LABEL_RU: Record<(typeof DAY_NAMES)[number], string> = {
  Mon: "Пн",
  Tue: "Вт",
  Wed: "Ср",
  Thu: "Чт",
  Fri: "Пт",
  Sat: "Сб",
  Sun: "Вс",
};

/** Один источник текстов `title` для таблицы и для HTML панели деталей. */
export const scheduleAssistantDetailTooltips = {
  room: "Показать аудиторию в панели деталей",
  instructor: "Показать преподавателя в панели деталей",
  group: "Показать группу в панели деталей",
  program: "Показать программу в панели деталей",
  resource: "Показать в панели деталей",
} as const;

export type MeetingOverrideField = "room" | "time" | "weekday" | "instructor";

export type Meeting = {
  instance_id: string;
  course: string;
  tag: string;
  groups: string[];
  date: string;
  start: string;
  room: string;
  instructors: string | string[];
  /** Copied from component; used in detail panel. */
  instructor_pool: unknown[];
  sections: string[];
  /** Canonical weekly-pattern date before edit.date override. */
  pattern_date?: string;
  /** Fields that differ from the recurring weekly pattern base. */
  override_fields?: MeetingOverrideField[];
};

export type Column = {
  yearLabel: string;
  groupId: string;
  groupLabel: string;
};

export type WeekRange = { key: string; start: string; end: string };

export type BuiltGrid = {
  allowedDays: string[];
  slots: { start: string; end: string; label: string }[];
  map: Map<string, Meeting[]>;
  weekMeetings: Meeting[];
  backToBackSources: Set<string>;
  backToBackTargets: Set<string>;
  tabMode: string;
};

export type Selection =
  | null
  | { type: "meeting"; value: string; course: string }
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
      room: slot.room ?? "",
      instructors: slot.instructor ?? "",
      cancelled: true,
    };
  }

  const resolvedDate = edit?.date ?? date;
  const resolvedStart = edit?.start_time
    ? String(edit.start_time).slice(0, 5)
    : String(slot.start_time).slice(0, 5);
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
  for (const section of getScheduleSections(config)) {
    for (const program of section.programs) {
      const yearLabel = program.name || section.code;
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
  return { groupNames, byProgram };
}

export function buildRoomCapacityMap(config: SchemaScheduleConfig) {
  const out: Record<string, number> = {};
  for (const r of config.rooms ?? []) out[r.id] = r.capacity;
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
  for (const [yearLabel, groupsSet] of Object.entries(meta.byProgram)) {
    const groups = Array.from(groupsSet)
      .filter((g) => usedGroups.has(g))
      .sort();
    for (const gid of groups) {
      columns.push({
        yearLabel,
        groupId: gid,
        groupLabel: meta.groupNames[gid] || gid,
      });
    }
  }
  const known = new Set(columns.map((c) => c.groupId));
  for (const gid of Array.from(usedGroups).sort()) {
    if (!known.has(gid)) {
      columns.push({
        yearLabel: "Other",
        groupId: gid,
        groupLabel: meta.groupNames[gid] || gid,
      });
    }
  }
  return columns;
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
            course: course.name,
            tag: component.tag,
            groups: audienceGroups,
            date: occurrence.date,
            start: String(occurrence.start_time).slice(0, 5),
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
              if (resolved.cancelled) continue;
              const overrideFields = weeklyMeetingOverrideFields(
                slot,
                date,
                config,
              );
              flat.push({
                instance_id: `${courseIdx}:${componentIdx}:${seriesIdx}:wp:${slotIdx}:${date}`,
                course: course.name,
                tag: component.tag,
                groups: audienceGroups,
                date: resolved.date,
                start: resolved.start,
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
  sectionByKind: Record<string, string>;
};

function buildSectionLookupMaps(
  config: SchemaScheduleConfig,
): SectionLookupMaps {
  const programToSection: Record<string, string> = {};
  const groupsToSections: Record<string, string> = {};
  const sectionByKind: Record<string, string> = {};

  for (const section of getScheduleSections(config)) {
    const sectionCode = String(section.code || "").trim();
    if (!sectionCode) continue;
    if (section.kind) {
      sectionByKind[String(section.kind).trim().toLowerCase()] = sectionCode;
    }
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

  return { programToSection, groupsToSections, sectionByKind };
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

function sectionsFromCourseTags(
  courseTags: (string | unknown)[] | undefined,
  sectionByKind: Record<string, string>,
): string[] {
  const out = new Set<string>();
  for (const tag of courseTags || []) {
    const tagStr = String(tag).trim().toLowerCase();
    if (tagStr === "english" && sectionByKind.english) {
      out.add(sectionByKind.english);
    } else if (tagStr === "elective" && sectionByKind.electives) {
      out.add(sectionByKind.electives);
    } else if (tagStr === "core_course" && sectionByKind.core) {
      out.add(sectionByKind.core);
    }
  }
  return Array.from(out);
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
      for (const groupId of expandStudentGroupSelectors(
        config,
        component.student_groups || [],
      )) {
        const sectionCode = maps.groupsToSections[groupId];
        if (sectionCode) courseSections.add(sectionCode);
      }
    }

    for (const sectionCode of sectionsFromCourseTags(
      course.course_tags,
      maps.sectionByKind,
    )) {
      courseSections.add(sectionCode);
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

export function buildGrid(
  config: SchemaScheduleConfig,
  allMeetings: Meeting[],
  weekStart: string,
  tabMode: string,
): BuiltGrid {
  const meetings = filterMeetingsByTab(allMeetings, tabMode, config).filter(
    (m) => {
      return weekStartMondayIso(m.date) === weekStart;
    },
  );

  const allowedDays = normalizedTermDays(config);
  const slotStarts = config.term.time_slots
    .map((t) => {
      if (typeof t === "string") return String(t).trim().slice(0, 5);
      return String(t.start_time).slice(0, 5);
    })
    .filter((t) => t.length > 0);
  const slots = slotStarts.map((s) => ({
    start: s,
    end: add90m(s),
    label: `${s}-${add90m(s)}`,
  }));
  const map = new Map<string, Meeting[]>();
  const backToBackSources = new Set<string>();
  const backToBackTargets = new Set<string>();

  for (const m of meetings) {
    const d = dayKey(m.date);
    const slot = String(m.start).slice(0, 5);
    for (const g of m.groups) {
      const k = `${d}|${slot}|${g}`;
      const current = map.get(k) || [];
      current.push(m);
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
      });
    }
    return ordered;
  }
  return sectionColumns;
}

export function filterMeetingsToCurrentWeek(
  meetings: Meeting[],
  weeks: WeekRange[],
  weekIndex: number,
) {
  const wk = weeks[weekIndex];
  if (!wk) return [];
  return (meetings || []).filter((m) => {
    return weekStartMondayIso(m.date) === wk.start;
  });
}

export function weekdaySessionCounts(meetings: Meeting[]) {
  const counts = Object.fromEntries(DAY_NAMES.map((d) => [d, 0])) as Record<
    string,
    number
  >;
  for (const m of meetings || []) {
    const dk = dayKey(m.date);
    if (counts[dk] !== undefined) counts[dk] += 1;
  }
  return counts;
}

export function weekdayDistinctCourseCounts(meetings: Meeting[]) {
  const sets = Object.fromEntries(
    DAY_NAMES.map((d) => [d, new Set<string>()]),
  ) as Record<string, Set<string>>;
  for (const m of meetings || []) {
    const dk = dayKey(m.date);
    if (sets[dk] !== undefined && m.course) sets[dk].add(m.course);
  }
  return DAY_NAMES.map((d) => sets[d].size);
}

export const MEETING_HOURS_PER_SLOT = 1.5;

export function weekdayWeightedMeetingHours(meetings: Meeting[]) {
  const sums = DAY_NAMES.map(() => 0);
  const dayIndex = Object.fromEntries(
    DAY_NAMES.map((d, i) => [d, i]),
  ) as Record<string, number>;
  for (const m of meetings || []) {
    const dk = dayKey(m.date);
    const i = dayIndex[dk];
    if (i === undefined) continue;
    const g = (m.groups || []).length;
    sums[i] += MEETING_HOURS_PER_SLOT * g;
  }
  return sums;
}

function histTooltipAttr(text: string) {
  return String(text).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

export function singleWeekdayHistogramHtml(
  title: string,
  subtitle: string,
  vals: number[],
  tooltipLine: (day: string, n: number) => string,
  options?: { formatBarLabel?: (v: number) => string },
) {
  const formatBarLabel = options?.formatBarLabel ?? ((v: number) => String(v));
  const maxVal = Math.max(0, ...vals);
  const max = maxVal > 0 ? maxVal : 1;
  const bars = DAY_NAMES.map((day, i) => {
    const n = vals[i]!;
    const pct = max > 0 ? (n / max) * 100 : 0;
    const h = n === 0 ? 3 : Math.max(8, Math.round((pct / 100) * 88));
    const tip = tooltipLine(day, n);
    const barHtml =
      n === 0
        ? `<div class="box-border h-[3px] min-h-0 w-[78%] max-w-7 rounded-t-md rounded-b-sm bg-[#b8c9e0] opacity-35"></div>`
        : `<div class="box-border max-h-full min-h-[3px] w-[78%] max-w-7 rounded-t-md rounded-b-sm bg-gradient-to-b from-[#3d84d6] to-[#2269bd] shadow-sm" style="height:${h}px"></div>`;
    return (
      `<div class="flex h-full min-h-0 min-w-0 flex-1 flex-col items-center" title="${histTooltipAttr(tip)}">` +
      `<div class="flex min-h-0 w-full flex-1 items-end justify-center overflow-hidden">${barHtml}</div>` +
      `<div class="mt-1 text-[0.6875rem] font-bold uppercase tracking-wide text-[#4f5c6d]">${DAY_LABEL_RU[day as (typeof DAY_NAMES)[number]] ?? day.slice(0, 3)}</div>` +
      `<div class="mt-0.5 text-[0.6875rem] text-[#5a6473]">${formatBarLabel(n)}</div>` +
      `</div>`
    );
  }).join("");
  return (
    `<div class="rounded-lg border border-[#d8dfeb] bg-[#f6f9ff] px-2 py-2.5">` +
    `<div class="mb-1.5 text-[0.6875rem] font-bold uppercase tracking-wide text-[#2d4f80]">${title}</div>` +
    `<div class="relative z-[1] mb-2.5 text-[0.6875rem] leading-snug text-[#4f5c6d]">${subtitle}</div>` +
    `<div class="flex h-24 min-h-0 items-end justify-between gap-1 overflow-hidden">${bars}</div>` +
    `</div>`
  );
}

export function workloadHistogramHtml(meetings: Meeting[]) {
  const counts = weekdaySessionCounts(meetings);
  const vals = DAY_NAMES.map((d) => counts[d] || 0);
  const totalSessions = vals.reduce((a, b) => a + b, 0);
  const totalMin = totalSessions * 90;
  const subtitle =
    totalSessions > 0
      ? `${totalSessions} занятий · ${totalMin} мин в расписании`
      : "На этой неделе нет занятий";
  return singleWeekdayHistogramHtml(
    "Нагрузка по дням (видимая неделя)",
    subtitle,
    vals,
    (day, n) =>
      `${DAY_LABEL_RU[day as (typeof DAY_NAMES)[number]] ?? day}: ${n} занят.`,
  );
}

export function groupWeekHistogramsHtml(meetings: Meeting[]) {
  const eventCounts = weekdaySessionCounts(meetings);
  const valsEvents = DAY_NAMES.map((d) => eventCounts[d] || 0);
  const totalEvents = valsEvents.reduce((a, b) => a + b, 0);
  const totalMin = totalEvents * 90;
  const subEvents =
    totalEvents > 0
      ? `${totalEvents} событий · ${totalMin} мин в расписании`
      : "На этой неделе нет событий";

  const valsSubjects = weekdayDistinctCourseCounts(meetings);
  const maxInOneDay = Math.max(0, ...valsSubjects);
  const uniqueCoursesWeek = new Set(
    (meetings || []).map((m) => m.course).filter(Boolean),
  ).size;
  const subSubjects =
    uniqueCoursesWeek > 0
      ? `${uniqueCoursesWeek} различных курсов на неделе · до ${maxInOneDay} в один день`
      : "На этой неделе нет курсов";

  const valsHours = weekdayWeightedMeetingHours(meetings);
  const totalWeightedH = valsHours.reduce((a, b) => a + b, 0);
  const subHours =
    totalWeightedH > 0
      ? `${totalWeightedH.toFixed(1)} ч всего · на занятие: ${MEETING_HOURS_PER_SLOT} ч × (число групп), сумма по дням`
      : "Нет взвешенных часов на этой неделе";
  const fmtH = (v: number) => (Math.abs(v) < 1e-9 ? "0" : Number(v).toFixed(1));
  const dayRu = (d: string) =>
    DAY_LABEL_RU[d as (typeof DAY_NAMES)[number]] ?? d;

  return (
    singleWeekdayHistogramHtml(
      "События по дням недели (видимая неделя)",
      subEvents,
      valsEvents,
      (day, n) => `${dayRu(day)}: ${n} с.`,
    ) +
    singleWeekdayHistogramHtml(
      "Разные курсы по дням (видимая неделя)",
      subSubjects,
      valsSubjects,
      (day, n) => `${dayRu(day)}: ${n} курсов`,
    ) +
    singleWeekdayHistogramHtml(
      "Часы занятий по дням (видимая неделя)",
      subHours,
      valsHours,
      (day, n) =>
        `${dayRu(day)}: ${fmtH(n)} ч (${MEETING_HOURS_PER_SLOT} ч × группы, сумма)`,
      { formatBarLabel: fmtH },
    )
  );
}
