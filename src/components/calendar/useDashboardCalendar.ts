import { $schedule } from "@/api/schedule";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { type CalendarSource, getCalendarSources } from "./calendar-sources.ts";
import {
  type CalendarDataError,
  deduplicateCalendarActivities,
  getLocalCalendarDay,
  normalizeDashboardIcs,
  normalizeDashboardMeetings,
} from "./dashboard-calendar-data.ts";
import { useWhen2MeetCalendarData } from "./useWhen2MeetCalendarEvents.ts";

export type {
  DashboardCalendarActivity,
  CalendarDataError,
} from "./dashboard-calendar-data.ts";

/** Typed text endpoints preserve auth middleware and TanStack's query caching. */
export function dashboardCalendarQueryOptions(source: CalendarSource) {
  if (source.kind === "group") {
    return $schedule.queryOptions("get", "/{event_group_alias}.ics", {
      params: {
        path: { event_group_alias: source.group.alias },
        query: { user_id: source.userId, export_type: "web" },
      },
      parseAs: "text",
    });
  }
  if (source.kind === "imported") {
    return $schedule.queryOptions(
      "get",
      "/users/{user_id}/linked/{linked_alias}.ics",
      {
        params: {
          path: { user_id: source.userId, linked_alias: source.calendar.alias },
        },
        parseAs: "text",
      },
    );
  }
  const paths = {
    "music-room": "/users/me/music-room.ics",
    sport: "/users/me/sport.ics",
    moodle: "/users/me/moodle.ics",
    events: "/users/me/events.ics",
    "room-bookings": "/users/me/room-bookings.ics",
  } as const;
  return $schedule.queryOptions("get", paths[source.kind], { parseAs: "text" });
}

/**
 * All selected non-sport activities overlapping today's local day. The caller
 * owns ticking nowMs, not-ended filtering, sorting, and the visible-item limit.
 * isError includes partial failures; successful activities remain available.
 */
export function useDashboardCalendar(nowMs: number) {
  const queryClient = useQueryClient();
  const userQuery = $schedule.useQuery("get", "/users/me");
  const groupsQuery = $schedule.useQuery("get", "/event-groups/");
  const predefinedQuery = $schedule.useQuery("get", "/users/me/predefined");
  const when2meet = useWhen2MeetCalendarData();
  const sources = useMemo(() => {
    if (!userQuery.data || !groupsQuery.data || !predefinedQuery.data)
      return [];
    return getCalendarSources(
      userQuery.data,
      predefinedQuery.data.event_groups,
      groupsQuery.data,
      { excludeSport: true },
    );
  }, [userQuery.data, groupsQuery.data, predefinedQuery.data]);

  const dayStartMs = getLocalCalendarDay(nowMs).start.getTime();
  const feedOptions = useMemo(
    () =>
      sources.map((source) => {
        const options = dashboardCalendarQueryOptions(source);
        return {
          ...options,
          staleTime: 60_000,
          // Stable selectors avoid re-expanding old recurring series on every tick.
          // TanStack exposes parser failures as query errors alongside HTTP errors.
          select: (ics: string) =>
            normalizeDashboardIcs(ics, source.id, dayStartMs),
        };
      }),
    [sources, dayStartMs],
  );
  const feedQueries = useQueries({ queries: feedOptions });
  const previousDayMs = useRef(dayStartMs);
  useEffect(() => {
    if (previousDayMs.current === dayStartMs) return;
    previousDayMs.current = dayStartMs;
    // Retain shared typed cache keys while refreshing feeds at local midnight.
    // Selectors already re-expand cached text immediately for the new day.
    for (const source of sources) {
      void queryClient.invalidateQueries({
        queryKey: dashboardCalendarQueryOptions(source).queryKey,
      });
    }
  }, [dayStartMs, sources, queryClient]);
  const metadataQueries = [userQuery, groupsQuery, predefinedQuery];
  const metadataIds = [
    "selection:user",
    "selection:groups",
    "selection:predefined",
  ];
  const errors: CalendarDataError[] = [
    ...metadataQueries.flatMap((query, index) =>
      query.isError
        ? [{ sourceId: metadataIds[index], error: query.error }]
        : [],
    ),
    ...feedQueries.flatMap((query, index) =>
      query.isError
        ? [{ sourceId: sources[index].id, error: query.error }]
        : [],
    ),
    ...when2meet.errors,
  ];

  return {
    activities: deduplicateCalendarActivities([
      ...feedQueries.flatMap((query) => query.data ?? []),
      ...normalizeDashboardMeetings(when2meet.meetings, dayStartMs),
    ]),
    isPending:
      metadataQueries.some((query) => query.isPending) ||
      feedQueries.some((query) => query.isPending) ||
      when2meet.isPending,
    isError: errors.length > 0,
    errors,
    refetch: async (): Promise<void> => {
      await Promise.all([
        ...metadataQueries.map((query) => query.refetch()),
        ...feedQueries.map((query) => query.refetch()),
        when2meet.refetch(),
      ]);
    },
  };
}
