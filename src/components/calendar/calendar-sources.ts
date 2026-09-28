import type { scheduleTypes } from "@/api/schedule";
import {
  getImportedLink,
  getICSLink,
  getMyEventsLink,
  getMyMoodleLink,
  getMyMusicRoomLink,
  getMyRoomBookingsLink,
  getMySportLink,
} from "@/api/schedule/links.ts";

export type CalendarSource =
  | {
      id: string;
      kind: "group";
      group: scheduleTypes.SchemaViewEventGroup;
      userId: number;
      excludeEnglish: boolean;
    }
  | {
      id: string;
      kind: "imported";
      calendar: scheduleTypes.SchemaLinkedCalendarView;
      userId: number;
    }
  | {
      id: string;
      kind: "music-room" | "sport" | "moodle" | "events" | "room-bookings";
    };

export type CalendarSelection = {
  id: number;
  favorite_event_groups?: string[];
  hidden_event_groups?: string[];
  music_room_hidden: boolean;
  sports_hidden: boolean;
  moodle_hidden: boolean;
  linked_calendars?: Record<
    string,
    scheduleTypes.SchemaLinkedCalendarView
  > | null;
};

/** Shared selection for the full calendar and dashboard; only the latter excludes sport. */
export function getCalendarSources(
  user: CalendarSelection,
  predefined: string[],
  eventGroups: scheduleTypes.SchemaListEventGroupsResponse,
  { excludeSport = false } = {},
): CalendarSource[] {
  const { favorite_event_groups, hidden_event_groups } = user;
  if (!favorite_event_groups || !hidden_event_groups) return [];
  const visibleAliases = new Set(
    [...favorite_event_groups, ...predefined].filter(
      (alias) => !hidden_event_groups.includes(alias),
    ),
  );
  const hasAssistantEnglish = [...visibleAliases].some((alias) =>
    alias.startsWith("english-"),
  );
  const sources: CalendarSource[] = [];
  for (const alias of visibleAliases) {
    const group = eventGroups.event_groups.find(
      (eventGroup) => eventGroup.alias === alias,
    );
    if (!group) continue;
    const isCoreCourses = group.tags?.some(
      (tag) => tag.type === "core-courses",
    );
    sources.push({
      id: `group:${alias}`,
      kind: "group",
      group,
      userId: user.id,
      excludeEnglish: hasAssistantEnglish && !!isCoreCourses,
    });
  }
  if (!user.music_room_hidden)
    sources.push({ id: "music-room", kind: "music-room" });
  if (!excludeSport && !user.sports_hidden)
    sources.push({ id: "sport", kind: "sport" });
  if (!user.moodle_hidden) sources.push({ id: "moodle", kind: "moodle" });
  sources.push(
    { id: "events", kind: "events" },
    { id: "room-bookings", kind: "room-bookings" },
  );
  for (const calendar of Object.values(user.linked_calendars ?? {})) {
    if (calendar.is_active)
      sources.push({
        id: `imported:${calendar.alias}`,
        kind: "imported",
        calendar,
        userId: user.id,
      });
  }
  return sources;
}

/** Keep the full calendar's URL and display metadata unchanged. No UI imports. */
export function calendarSourceToUrl(source: CalendarSource) {
  if (source.kind === "group") {
    return {
      url: getICSLink(source.group.alias, source.userId),
      eventGroup: source.group,
      excludeEnglish: source.excludeEnglish,
    };
  }
  if (source.kind === "imported") {
    return {
      url: getImportedLink(source.userId, source.calendar.alias),
      color: source.calendar.color || undefined,
      updatedAt: new Date().toISOString(),
    };
  }
  const personal = {
    "music-room": {
      url: getMyMusicRoomLink,
      sourceLink: "https://telegram.me/InnoMusicRoomBot",
    },
    sport: {
      url: getMySportLink,
      sourceLink: "https://sport.innopolis.university",
    },
    moodle: {
      url: getMyMoodleLink,
      sourceLink:
        "https://moodle.innopolis.university/calendar/view.php?view=month",
    },
    events: {
      url: getMyEventsLink,
      sourceLink: "https://innohassle.ru/events",
    },
    "room-bookings": {
      url: getMyRoomBookingsLink,
      sourceLink: "https://innohassle.ru/room-booking",
    },
  }[source.kind];
  return {
    url: personal.url(),
    sourceLink: personal.sourceLink,
    color: "seagreen",
    updatedAt: new Date().toISOString(),
  };
}
