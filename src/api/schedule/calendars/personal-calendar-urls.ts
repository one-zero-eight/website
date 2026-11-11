import { createApiQueryError } from "@/api/helpers/create-query-client.ts";
import { customFetch } from "@/api/helpers/custom-fetch.ts";
import { $schedule, scheduleTypes } from "@/api/schedule";
import { expandICalEvents } from "@/api/schedule/calendars/event-source-def.ts";
import { loadIcalExpander } from "@/api/schedule/calendars/loadIcalExpander.ts";
import {
  getICSLink,
  getImportedLink,
  getMyEventsLink,
  getMyMoodleLink,
  getMyMusicRoomLink,
  getMyRoomBookingsLink,
  getMySportLink,
  SCHEDULE_API_URL,
} from "@/api/schedule/calendars/links.ts";
import { useWhen2MeetCalendarEvents } from "@/api/schedule/calendars/useWhen2MeetCalendarEvents.ts";
import { SchemaLinkedCalendarView } from "@/api/schedule/types.ts";
import { $sport } from "@/api/sport";
import {
  filterUpcomingCheckedInSchedule,
  fromCalendarSpace,
  trainingScheduleToCalendarEvent,
} from "@/components/sport/sport-calendar-events.ts";
import { toScheduleApiDateTime } from "@/components/sport/sport-week-utils.ts";
import type { EventInput } from "@fullcalendar/core";
import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";

export type CalendarSource = {
  url: string;
  color?: string;
  sourceLink?: string;
  updatedAt?: string;
  eventGroup?: scheduleTypes.SchemaViewEventGroup;
  excludeEnglish?: boolean;
};

export type CalendarConfig = {
  urls?: CalendarSource[];
  includeFullPersonalCalendar?: boolean;
  includePersonalWhen2meet?: boolean;
  includePersonalSport?: boolean;

  /* Start datetime to show events (including overlaps near this border) */
  start?: Date;
  /* End datetime to show events (including overlaps near this border) */
  end?: Date;
  /* Should deduplicate events? Will hide events if there is another event with the same id in the next calendars. */
  mergeDuplicates?: boolean;
};

const NO_EVENTS: EventInput[] = [];

/**
 * Fetch calendars and extract events in FullCalendar's format (EventInput).
 * Returns a wider window than 'start'-'end': the range is expanded on both
 * sides, so that the events of the neighbouring ranges are loaded in advance.
 */
export function useCalendarEvents({
  urls,
  includeFullPersonalCalendar,
  includePersonalWhen2meet,
  includePersonalSport,
  start,
  end,
  mergeDuplicates: _,
}: CalendarConfig): EventInput[] {
  // TODO: return grouped by calendar source
  // TODO: specify how to handle hidden calendars
  // TODO: use mergeDuplicates

  // FullCalendar renders the new date range before the parent component learns
  // about it (via `datesSet`), so the events of the neighbouring ranges must be
  // loaded in advance. Otherwise the view flashes blank until the events of the
  // new range are added.
  const expandedRange = useMemo(() => {
    const duration = start && end ? end.getTime() - start.getTime() : 0;
    return {
      start: start ? new Date(start.getTime() - duration) : undefined,
      end: end ? new Date(end.getTime() + duration) : undefined,
    };
  }, [start, end]);

  // Request events that are to be requested from API
  const when2meetEvents = useWhen2MeetCalendarEvents({
    enabled: includePersonalWhen2meet,
  });
  const sportEvents = usePersonalSportEvents({
    enabled: includePersonalSport,
    start: expandedRange.start,
    end: expandedRange.end,
  });

  // Gather all calendar sources (.ics urls)
  const personalCalendars = usePersonalCalendars({
    enabled: includeFullPersonalCalendar,
  });
  const icsCalendarsToFetch = useMemo(() => {
    const result: CalendarSource[] = [];
    if (urls) result.push(...urls);
    result.push(...personalCalendars);
    return result;
  }, [urls, personalCalendars]);

  // Fetch .ics calendars
  const icsQueries = useQueries({
    queries: icsCalendarsToFetch.map(queryCalendar),
  });

  // Expand the documents synchronously instead of using a query: a pending
  // query would drop the events on every date change, and the calendar would
  // show an empty range until the query resolves.
  const loadedDocumentsKey = icsQueries
    .map(
      ({ data, dataUpdatedAt }) => `${data?.fetchUrl ?? ""}@${dataUpdatedAt}`,
    )
    .join("\n");
  const icsEvents = useMemo(
    () =>
      icsQueries.flatMap(({ data }, index) =>
        data
          ? expandICalEvents(
              data.expander,
              expandedRange.start,
              expandedRange.end,
              icsCalendarsToFetch[index],
            )
          : [],
      ),
    // 'loadedDocumentsKey' describes which documents are loaded and when, while
    // the query results array is recreated on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loadedDocumentsKey, expandedRange],
  );

  return useMemo(
    () => [...icsEvents, ...when2meetEvents, ...sportEvents],
    [icsEvents, when2meetEvents, sportEvents],
  );
}

function queryCalendar(source: CalendarSource) {
  const fetchUrl = resolveCalendarFetchUrl(source.url);
  return {
    queryKey: ["calendar-ics", fetchUrl],
    queryFn: async ({ signal }: { signal: AbortSignal }) => {
      const { data, error, response } = await customFetch.GET(fetchUrl, {
        parseAs: "text",
        signal,
      });
      if (!response.ok) {
        throw createApiQueryError(error, response);
      }
      try {
        return {
          fetchUrl,
          expander: await loadIcalExpander(data as string),
        };
      } catch (e) {
        throw new Error(
          `Invalid ICS from "${source.url}": ${
            e instanceof Error ? e.message : String(e)
          }`,
        );
      }
    },
  };
}

function resolveCalendarFetchUrl(url: string) {
  if (
    url.startsWith(SCHEDULE_API_URL) ||
    url.startsWith("https://api.innohassle.ru")
  ) {
    return url;
  }
  return `${SCHEDULE_API_URL}/me/check-calendar-url-to-link?${new URLSearchParams(
    {
      calendar_url: url,
    },
  )}`;
}

function usePersonalCalendars({
  enabled,
}: {
  enabled?: boolean;
}): CalendarSource[] {
  const { data: scheduleUser } = $schedule.useQuery(
    "get",
    "/users/me",
    undefined,
    { enabled },
  );
  const { data: eventGroups } = $schedule.useQuery(
    "get",
    "/event-groups/",
    undefined,
    { enabled },
  );
  const { data: predefined } = $schedule.useQuery(
    "get",
    "/users/me/predefined",
    undefined,
    { enabled },
  );

  if (!enabled) {
    return [];
  }

  if (
    scheduleUser?.favorite_event_groups === undefined ||
    scheduleUser?.hidden_event_groups === undefined ||
    predefined === undefined ||
    eventGroups === undefined
  ) {
    return [];
  }

  return getCalendarsToShow(
    scheduleUser.favorite_event_groups,
    scheduleUser.hidden_event_groups,
    predefined.event_groups,
    eventGroups,
    scheduleUser.id,
    scheduleUser.music_room_hidden,
    scheduleUser.moodle_hidden,
    Object.values(scheduleUser.linked_calendars || {}),
  );
}

function usePersonalSportEvents({
  enabled,
  start,
  end,
}: {
  enabled?: boolean;
  start?: Date;
  end?: Date;
}): EventInput[] {
  // TODO: make start, end not required (currently it will show request error)
  // Include previous and next day
  let sportStart;
  let sportEnd;
  if (start) {
    sportStart = fromCalendarSpace(start);
    sportStart.setDate(sportStart.getDate() - 1);
    sportStart = toScheduleApiDateTime(sportStart);
  }
  if (end) {
    sportEnd = fromCalendarSpace(end);
    sportEnd.setDate(sportEnd.getDate() + 1);
    sportEnd = toScheduleApiDateTime(sportEnd);
  }

  const { data } = $sport.useQuery(
    "get",
    "/users/me/schedule",
    {
      params: {
        query: {
          start: sportStart ?? "",
          end: sportEnd ?? "",
        },
      },
    },
    {
      enabled,
      select: (data) =>
        filterUpcomingCheckedInSchedule(data ?? []).map(
          trainingScheduleToCalendarEvent,
        ),
    },
  );

  if (!enabled) {
    return NO_EVENTS;
  }

  return data ?? NO_EVENTS;
}

export function getPersonalCalendarIcsUrls({
  favorites,
  hidden,
  predefined,
  eventGroups,
  userId,
  musicRoomHidden,
  sportsHidden,
  moodleHidden,
}: {
  favorites: string[];
  hidden: string[];
  predefined: string[];
  eventGroups: scheduleTypes.SchemaListEventGroupsResponse;
  userId: number | undefined;
  musicRoomHidden: boolean;
  sportsHidden: boolean;
  moodleHidden: boolean;
}) {
  const urls: string[] = favorites.concat(predefined).flatMap((groupAlias) => {
    if (hidden.includes(groupAlias)) {
      return [];
    }

    const group = eventGroups.event_groups.find(
      (item) => item.alias === groupAlias,
    );

    if (!group) {
      return [];
    }

    return [getICSLink(group.alias, userId)];
  });

  if (!musicRoomHidden) {
    urls.push(getMyMusicRoomLink());
  }

  if (!sportsHidden) {
    urls.push(getMySportLink());
  }

  if (!moodleHidden) {
    urls.push(getMyMoodleLink());
  }

  urls.push(getMyEventsLink());
  urls.push(getMyRoomBookingsLink());

  return [...new Set(urls)];
}

function getCalendarsToShow(
  favorites: string[],
  hidden: string[],
  predefined: string[],
  eventGroups: scheduleTypes.SchemaListEventGroupsResponse,
  userId: number | undefined,
  music_room_hidden: boolean,
  moodle_hidden: boolean,
  imported: SchemaLinkedCalendarView[],
): CalendarSource[] {
  const visibleAliases = new Set(
    favorites.concat(predefined).filter((alias) => !hidden.includes(alias)),
  );
  const hasAssistantEnglish = [...visibleAliases].some((alias) =>
    alias.startsWith("english-"),
  );

  // Remove hidden calendars
  const toShow: CalendarSource[] = [...visibleAliases].flatMap((alias) => {
    const group = eventGroups.event_groups.find(
      (eventGroup) => eventGroup.alias === alias,
    );
    if (!group) return [];
    const isCoreCourses = group.tags?.some(
      (tag) => tag.type === "core-courses",
    );
    return [
      {
        url: getICSLink(group.alias, userId),
        eventGroup: group,
        excludeEnglish: hasAssistantEnglish && isCoreCourses,
      },
    ];
  });

  // Add personal calendars
  if (!music_room_hidden) {
    toShow.push({
      url: getMyMusicRoomLink(),
      color: "seagreen",
      sourceLink: "https://telegram.me/InnoMusicRoomBot",
      updatedAt: new Date().toISOString(),
    });
  }

  if (!moodle_hidden) {
    toShow.push({
      url: getMyMoodleLink(),
      color: "seagreen",
      sourceLink:
        "https://moodle.innopolis.university/calendar/view.php?view=month",
      updatedAt: new Date().toISOString(),
    });
  }

  toShow.push({
    url: getMyEventsLink(),
    color: "seagreen",
    sourceLink: "https://innohassle.ru/events",
    updatedAt: new Date().toISOString(),
  });

  toShow.push({
    url: getMyRoomBookingsLink(),
    color: "seagreen",
    sourceLink: "https://innohassle.ru/room-booking",
    updatedAt: new Date().toISOString(),
  });

  // Add imported calendars
  imported.forEach((v) => {
    if (v.is_active)
      toShow.push({
        url: getImportedLink(userId, v.alias),
        color: v.color || undefined,
        updatedAt: new Date().toISOString(),
      });
  });

  // Return unique items
  return toShow.filter((value, index, array) => array.indexOf(value) === index);
}
