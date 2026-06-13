import type { SchemaScheduleConfig } from "@/api/schedule-assistant/types.ts";

import {
  DAY_NAMES,
  add90m,
  filterMeetingsByTab,
  normalizedTermDays,
  todayIsoDate,
  weekRelativeToToday,
  type Meeting,
  type WeekRange,
  type WeekRelativePosition,
} from "./timetableViewerModel.ts";

const DAY_HEADER_RU: Record<(typeof DAY_NAMES)[number], string> = {
  Mon: "Понедельник",
  Tue: "Вторник",
  Wed: "Среда",
  Thu: "Четверг",
  Fri: "Пятница",
  Sat: "Суббота",
  Sun: "Воскресенье",
};

export type CalendarDayColumn = {
  key: string;
  day: (typeof DAY_NAMES)[number];
  date: string;
  headerLabel: string;
  dateLabel: string;
  isToday: boolean;
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
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
  });
}

export const MEETING_CALENDAR_GROUPS_LIMIT = 1;

export function meetingCalendarMainLabel(meeting: Meeting) {
  const course = String(meeting.course || "").trim();
  const room = String(meeting.room || "").trim();
  return [course, room].filter(Boolean).join(" ") || "—";
}

export function meetingCalendarGroupsLabel(
  groups: string[] | undefined,
  limit = MEETING_CALENDAR_GROUPS_LIMIT,
) {
  const list = (groups || []).filter(Boolean);
  if (!list.length) return null;
  if (list.length <= limit) return list.join(", ");
  return `${list.slice(0, limit).join(", ")}, ...`;
}

export function meetingCalendarCellLabel(meeting: Meeting) {
  const mainLabel = meetingCalendarMainLabel(meeting);
  const groupsLabel = meetingCalendarGroupsLabel(meeting.groups);
  if (!groupsLabel) return mainLabel;
  return `${mainLabel} (${groupsLabel})`;
}

export function buildCalendarGrid(
  config: SchemaScheduleConfig,
  allMeetings: Meeting[],
  weeks: WeekRange[],
  tabMode: string,
): BuiltCalendarGrid | null {
  if (!weeks.length) return null;

  const allowedDays = normalizedTermDays(config);
  const today = todayIsoDate();

  const slotStarts = (config.term.time_slots || [])
    .map((slot) => {
      if (typeof slot === "string") return String(slot).trim().slice(0, 5);
      return String(slot.start_time).slice(0, 5);
    })
    .filter((slot) => slot.length > 0);

  const slots: CalendarSlot[] = slotStarts.map((start) => ({
    start,
    end: add90m(start),
    label: `${start}–${add90m(start)}`,
  }));

  const tabMeetings = filterMeetingsByTab(allMeetings, tabMode, config).filter(
    (meeting) => !meeting.cancelled,
  );

  const cells = new Map<string, Meeting[]>();
  for (const meeting of tabMeetings) {
    const slot = String(meeting.start).slice(0, 5);
    const key = `${meeting.date}|${slot}`;
    const current = cells.get(key) || [];
    current.push(meeting);
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
    weekRangeLabel: `${week.start} — ${week.end}`,
    weekRelative: weekRelativeToToday(week, today),
    days: allowedDays.map((day) => {
      const date = dateForWeekDay(week.start, day);
      return {
        key: `${week.key}-${date}`,
        day,
        date,
        headerLabel: DAY_HEADER_RU[day],
        dateLabel: formatCalendarDate(date),
        isToday: date === today,
      };
    }),
  }));

  return { slots, weeks: weekBlocks, cells };
}
