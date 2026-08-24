import type { SchemaScheduleConfig } from "@/api/schedule-assistant/types.ts";
import { getScheduleSections } from "@/components/schedule-assistant/config/scheduleConfigUtils.ts";
import { normalizeTracksFromSectionProgram } from "@/components/schedule-assistant/settings/groups/normalizeTrackFromSectionProgram.ts";

import {
  buildGroupToProgramMap,
  isMeetingOnSlot,
  nearestSlotStart,
  normalizeHhmm,
  programResolvedTimeSlots,
  termResolvedTimeSlots,
  toMinutes,
  unionResolvedTimeSlots,
} from "./programTimeSlots.ts";
import {
  DAY_NAMES,
  WEEKDAY_LABEL_RU,
  filterMeetingsByTab,
  formatDisplayDate,
  normalizedTermDays,
  todayIsoDate,
  weekRelativeToToday,
  type Meeting,
  type WeekRange,
  type WeekRelativePosition,
} from "./timetableViewerModel.ts";

export type CalendarDayColumn = {
  key: string;
  day: (typeof DAY_NAMES)[number];
  date: string;
  headerLabel: string;
  dateLabel: string;
  isToday: boolean;
  isInactive: boolean;
};

export type CalendarWeekBlock = {
  key: string;
  weekNumber: number;
  weekLabel: string;
  weekRangeLabel: string;
  weekRelative: WeekRelativePosition;
  days: CalendarDayColumn[];
};

export type CalendarSlot = {
  start: string;
  end: string;
  label: string;
};

export type BuiltCalendarGrid = {
  slots: CalendarSlot[];
  weeks: CalendarWeekBlock[];
  cells: Map<string, Meeting[]>;
};

function formatLocalDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dateForWeekDay(
  weekStartMonday: string,
  day: (typeof DAY_NAMES)[number],
) {
  const idx = DAY_NAMES.indexOf(day);
  const start = new Date(`${weekStartMonday}T00:00:00`);
  start.setDate(start.getDate() + idx);
  return formatLocalDate(start);
}

function formatCalendarDate(dateStr: string) {
  return formatDisplayDate(dateStr, { withYear: false });
}

export function formatCalendarWeekRange(start: string, end: string) {
  return `${formatCalendarDate(start)} — ${formatCalendarDate(end)}`;
}

export const MEETING_CALENDAR_GROUPS_LIMIT = 3;

export function meetingCalendarMainLabel(meeting: Meeting) {
  const course = String(
    meeting.course_short_name || meeting.course || "",
  ).trim();
  const room = String(meeting.room || "").trim();
  return [course, room].filter(Boolean).join(" ") || "—";
}

export function meetingCalendarGroupsLabel(
  meeting: Meeting,
  limit: number | null = MEETING_CALENDAR_GROUPS_LIMIT,
) {
  const list = (meeting.groups || []).filter(Boolean);
  if (!list.length) return null;

  const shortName = String(meeting.course_short_name ?? "")
    .trim()
    .toLowerCase();
  if (list.length === 1 && shortName) {
    const onlyGroup = list[0]!.trim().toLowerCase();
    if (onlyGroup === shortName) return null;
  }

  if (limit === null || list.length <= limit) return list.join(", ");
  return `${list.slice(0, limit).join(", ")}, ...`;
}

export function meetingCalendarCellLabel(
  meeting: Meeting,
  groupsLimit: number | null = MEETING_CALENDAR_GROUPS_LIMIT,
) {
  const mainLabel = meetingCalendarMainLabel(meeting);
  const groupsLabel = meetingCalendarGroupsLabel(meeting, groupsLimit);
  if (!groupsLabel) return mainLabel;
  return `${mainLabel} (${groupsLabel})`;
}

export function buildCalendarGrid(
  config: SchemaScheduleConfig,
  allMeetings: Meeting[],
  weeks: WeekRange[],
  tabMode: string,
  programCode?: string,
): BuiltCalendarGrid | null {
  if (!weeks.length) return null;

  const allowedDays = normalizedTermDays(config);
  const today = todayIsoDate();

  const termSlots = termResolvedTimeSlots(config);
  const groupToProgram = buildGroupToProgramMap(config);
  const slotsResolved = termSlots.length
    ? termSlots
    : unionResolvedTimeSlots(
        getScheduleSections(config).flatMap((section) =>
          (section.programs || []).map((program) =>
            programResolvedTimeSlots(program, termSlots),
          ),
        ),
      );
  const slots: CalendarSlot[] = slotsResolved.map((slot) => ({
    start: slot.start,
    end: slot.end,
    label: `${slot.start}–${slot.end}`,
  }));
  const slotByStart = new Map(slotsResolved.map((slot) => [slot.start, slot]));

  const selectedProgram = getScheduleSections(config)
    .find((section) => section.code === tabMode)
    ?.programs?.find((program) => program.code === programCode);
  const selectedProgramGroups = selectedProgram
    ? new Set(
        normalizeTracksFromSectionProgram(selectedProgram).flatMap(
          (track) => track.groups,
        ),
      )
    : null;
  const programSemester = selectedProgram?.semester
    ? {
        start: String(selectedProgram.semester.start_date).slice(0, 10),
        end: String(selectedProgram.semester.end_date).slice(0, 10),
      }
    : null;
  const tabMeetings = filterMeetingsByTab(allMeetings, tabMode).filter(
    (meeting) =>
      !meeting.cancelled &&
      (!selectedProgramGroups ||
        meeting.groups.some((group) => selectedProgramGroups.has(group))),
  );

  const cells = new Map<string, Meeting[]>();
  for (const meeting of tabMeetings) {
    const start = normalizeHhmm(meeting.start);
    const end = meeting.end ? normalizeHhmm(meeting.end) : undefined;
    const program = (meeting.groups || [])
      .map((gid) => groupToProgram.get(gid))
      .find(Boolean);
    const programSlots = programResolvedTimeSlots(program, termSlots);
    const exact = programSlots.find((slot) => slot.start === start);
    const onProgramSlot = exact ? isMeetingOnSlot(start, end, exact) : false;
    const onTermRow = slotByStart.has(start);
    let rowStart = start;
    let offGrid = false;
    let offsetMinutes = 0;
    if (onProgramSlot && onTermRow) {
      rowStart = start;
    } else if (onProgramSlot) {
      const nearest = nearestSlotStart(start, slotsResolved);
      rowStart = nearest || start;
    } else {
      const nearest =
        nearestSlotStart(start, slotsResolved) ||
        nearestSlotStart(start, programSlots);
      if (nearest) {
        rowStart = nearest;
        offGrid = true;
        offsetMinutes = toMinutes(start) - toMinutes(nearest);
      } else {
        offGrid = true;
      }
    }
    const placed: Meeting = {
      ...meeting,
      start,
      end,
      off_grid: offGrid || undefined,
      off_grid_offset_minutes: offGrid ? offsetMinutes : undefined,
    };
    const key = `${meeting.date}|${rowStart}`;
    const current = cells.get(key) || [];
    current.push(placed);
    cells.set(key, current);
  }

  for (const [key, meetings] of cells) {
    cells.set(
      key,
      meetings.sort((a, b) =>
        meetingCalendarCellLabel(a).localeCompare(
          meetingCalendarCellLabel(b),
          "ru",
        ),
      ),
    );
  }

  const weekBlocks: CalendarWeekBlock[] = weeks.map((week, index) => ({
    key: week.key,
    weekNumber: index + 1,
    weekLabel: `Неделя ${index + 1}`,
    weekRangeLabel: formatCalendarWeekRange(week.start, week.end),
    weekRelative: weekRelativeToToday(week, today),
    days: allowedDays.map((day) => {
      const date = dateForWeekDay(week.start, day);
      return {
        key: `${week.key}-${date}`,
        day,
        date,
        headerLabel: WEEKDAY_LABEL_RU[day],
        dateLabel: formatCalendarDate(date),
        isToday: date === today,
        isInactive:
          programSemester != null &&
          (date < programSemester.start || date > programSemester.end),
      };
    }),
  }));

  return { slots, weeks: weekBlocks, cells };
}
