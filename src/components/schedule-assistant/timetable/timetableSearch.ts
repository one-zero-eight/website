import type { TimetableViewConfig as SchemaScheduleConfig } from "./timetableViewTypes.ts";
import { listAudienceInlineItems } from "./meetingAudienceSummary.ts";
import { parseMeetingInstanceId } from "./meetingEditUtils.ts";
import {
  resolveInstructorLabel,
  resolveWeeklyMeetingFields,
  type Meeting,
} from "./timetableViewerModel.ts";

const monthAliases = [
  ["январь", "января", "янв"],
  ["февраль", "февраля", "фев", "февр"],
  ["март", "марта", "мар"],
  ["апрель", "апреля", "апр"],
  ["май", "мая"],
  ["июнь", "июня", "июн"],
  ["июль", "июля", "июл"],
  ["август", "августа", "авг"],
  ["сентябрь", "сентября", "сен", "сент"],
  ["октябрь", "октября", "окт"],
  ["ноябрь", "ноября", "ноя", "нояб"],
  ["декабрь", "декабря", "дек"],
];
const monthByAlias = new Map(
  monthAliases.flatMap((aliases, index) =>
    aliases.map((alias) => [alias, index + 1] as const),
  ),
);
const weekdays = [
  "воскресенье",
  "понедельник",
  "вторник",
  "среда",
  "четверг",
  "пятница",
  "суббота",
];
const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
  year: "numeric",
});
const currentYearDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
});
const weekdayFormatter = new Intl.DateTimeFormat("ru-RU", { weekday: "short" });

export type TimetableSearchEntry = {
  meeting: Meeting;
  seriesKey: string;
  details: string;
  audienceLabel: string;
  instructorLabel: string;
  weekdayLabel: string;
  dateLabel: string;
  weekday: number;
  searchText: string;
};

export type TimetableSearchResult = {
  key: string;
  entry: TimetableSearchEntry;
  occurrences: TimetableSearchEntry[];
  isSeries: boolean;
};

export function parseTimetableSearchQuery(query: string) {
  let text = query.trim().toLowerCase();
  let date: { day: number; month: number; year?: number } | undefined;
  const iso = /(?:^|\s)(\d{4})-(\d{2})-(\d{2})(?=\s|$)/;
  const numeric = /(?:^|\s)(\d{1,2})\.(\d{1,2})(?:\.(\d{4}))?(?=\s|$)/;
  const named = new RegExp(
    `(?:^|\\s)(\\d{1,2})\\s+(${[...monthByAlias.keys()].join("|")})\\.?(?:\\s+(\\d{4}))?(?=\\s|$)`,
  );
  if (iso.test(text)) {
    text = text.replace(iso, (_, year, month, day) => {
      date = { day: Number(day), month: Number(month), year: Number(year) };
      return " ";
    });
  } else if (numeric.test(text)) {
    text = text.replace(numeric, (_, day, month, year) => {
      date = {
        day: Number(day),
        month: Number(month),
        year: year ? Number(year) : undefined,
      };
      return " ";
    });
  } else {
    text = text.replace(named, (_, day, month, year) => {
      date = {
        day: Number(day),
        month: monthByAlias.get(month)!,
        year: year ? Number(year) : undefined,
      };
      return " ";
    });
  }
  const words = text.split(/\s+/).filter(Boolean);
  const weekdayWord = words.find((word) => weekdays.includes(word));
  return {
    date,
    weekday: weekdayWord ? weekdays.indexOf(weekdayWord) : undefined,
    words: words.filter((word) => word !== weekdayWord),
    hasQuery: Boolean(query.trim()),
  };
}

export function buildTimetableSearchEntries(
  meetings: Meeting[],
  instructorLabels: Record<string, string>,
  config: SchemaScheduleConfig,
): TimetableSearchEntry[] {
  return meetings
    .filter((meeting) => !meeting.cancelled)
    .map((meeting) => {
      const ref = parseMeetingInstanceId(meeting.instance_id);
      const seriesKey =
        ref?.kind === "wp"
          ? `${ref.courseIdx}:${ref.componentIdx}:${ref.seriesIdx}:wp:${ref.slotIdx}`
          : meeting.instance_id;
      const date = new Date(`${meeting.date}T12:00:00`);
      const instructors = (
        typeof meeting.instructors === "string"
          ? [meeting.instructors]
          : meeting.instructors
      )
        .map((id) => resolveInstructorLabel(id, instructorLabels))
        .join(", ");
      const audienceLabel = listAudienceInlineItems(config, meeting.groups)
        .map((item) => item.label)
        .join(", ");
      const weekdayLabel = weekdayFormatter
        .format(date)
        .replace(/^./u, (letter) => letter.toUpperCase());
      const details = [
        weekdayLabel,
        `${meeting.start}${meeting.end ? `–${meeting.end}` : ""}`,
        meeting.room,
        audienceLabel,
        instructors,
      ]
        .filter(Boolean)
        .join(" · ");
      return {
        meeting,
        seriesKey,
        details,
        audienceLabel,
        instructorLabel: instructors,
        weekdayLabel,
        dateLabel: (date.getFullYear() === new Date().getFullYear()
          ? currentYearDateFormatter
          : dateFormatter
        ).format(date),
        weekday: date.getDay(),
        searchText: [
          meeting.course,
          meeting.course_short_name,
          meeting.tag,
          meeting.groups.join(" "),
          details,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase(),
      };
    })
    .sort((a, b) =>
      `${a.meeting.date} ${a.meeting.start}`.localeCompare(
        `${b.meeting.date} ${b.meeting.start}`,
      ),
    );
}

export function buildTimetableSeriesEntry(
  entry: TimetableSearchEntry,
  config: SchemaScheduleConfig,
  instructorLabels: Record<string, string>,
): TimetableSearchEntry {
  const ref = parseMeetingInstanceId(entry.meeting.instance_id);
  if (ref?.kind !== "wp") return entry;
  const slot =
    config.courses?.[ref.courseIdx]?.components?.[ref.componentIdx]?.sessions?.[
      ref.seriesIdx
    ]?.weekly_pattern?.[ref.slotIdx];
  if (!slot) return entry;
  const base = resolveWeeklyMeetingFields(
    { ...slot, edits: [] },
    ref.date,
    config,
  );
  return buildTimetableSearchEntries(
    [{ ...entry.meeting, ...base, override_fields: [] }],
    instructorLabels,
    config,
  )[0];
}

export function timetableOccurrenceDifferences(
  entry: TimetableSearchEntry,
  base: TimetableSearchEntry,
) {
  return {
    time:
      entry.meeting.start !== base.meeting.start ||
      entry.meeting.end !== base.meeting.end ||
      entry.weekday !== base.weekday,
    room: entry.meeting.room !== base.meeting.room,
    audience: entry.audienceLabel !== base.audienceLabel,
    instructor: entry.instructorLabel !== base.instructorLabel,
  };
}

export function searchTimetableEntries(
  entries: TimetableSearchEntry[],
  query: string,
  activeDate: string,
): TimetableSearchResult[] {
  const parsed = parseTimetableSearchQuery(query);
  if (!parsed.hasQuery) return [];
  const matches = entries.filter((entry) => {
    if (!parsed.words.every((word) => entry.searchText.includes(word)))
      return false;
    if (parsed.weekday !== undefined && entry.weekday !== parsed.weekday)
      return false;
    if (!parsed.date) return true;
    const [year, month, day] = entry.meeting.date.split("-").map(Number);
    return (
      parsed.date.day === day &&
      parsed.date.month === month &&
      (parsed.date.year === undefined || parsed.date.year === year)
    );
  });
  const groups = new Map<string, TimetableSearchEntry[]>();
  for (const entry of matches) {
    const key = parsed.date ? entry.meeting.instance_id : entry.seriesKey;
    const group = groups.get(key);
    if (group) group.push(entry);
    else groups.set(key, [entry]);
  }
  return [...groups]
    .map(([key, occurrences]) => {
      const entry =
        occurrences.find((item) => item.meeting.date >= activeDate) ??
        occurrences[occurrences.length - 1];
      const audience = [
        ...new Set(entry.meeting.groups.map((group) => group.toLowerCase())),
      ];
      const specificity = audience.length
        ? audience.filter((group) =>
            parsed.words.some((word) => group.includes(word)),
          ).length / audience.length
        : 0;
      return {
        key,
        entry,
        occurrences,
        isSeries: !parsed.date && occurrences.length > 1,
        specificity,
      };
    })
    .sort((a, b) => b.specificity - a.specificity);
}
