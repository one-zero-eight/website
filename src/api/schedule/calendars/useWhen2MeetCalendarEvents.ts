import { useMe } from "@/api/accounts/user.ts";
import { $when2meet } from "@/api/when2meet";
import { EventInput } from "@fullcalendar/core";
import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import { when2MeetEventsToCalendarEvents } from "./when2meet-events.ts";

const NO_EVENTS: EventInput[] = [];

export function useWhen2MeetCalendarEvents({
  enabled,
}: {
  enabled?: boolean;
}): EventInput[] {
  const { me } = useMe();
  const isEnabled = enabled && !!me?.id;

  const { data: ownedMeetings = [] } = $when2meet.useQuery(
    "get",
    "/meetings/",
    {},
    { enabled: isEnabled },
  );

  const { data: participatingMeetings = [] } = $when2meet.useQuery(
    "get",
    "/meetings/participating",
    {},
    { enabled: isEnabled },
  );

  const meetingSummaries = useMemo(() => {
    const bySlug = new Map<string, (typeof ownedMeetings)[number]>();

    for (const meeting of [...ownedMeetings, ...participatingMeetings]) {
      bySlug.set(meeting.slug, meeting);
    }

    return [...bySlug.values()];
  }, [ownedMeetings, participatingMeetings]);

  const meetingQueries = useQueries({
    queries: meetingSummaries.map((meeting) => ({
      ...$when2meet.queryOptions("get", "/meetings/{meeting_ref}", {
        params: { path: { meeting_ref: meeting.slug } },
      }),
      enabled: isEnabled,
    })),
  });

  const loadedMeetingsKey = meetingQueries
    .map(({ status, dataUpdatedAt }) => `${status}@${dataUpdatedAt}`)
    .join("|");

  const result = useMemo(() => {
    const events = meetingQueries
      .map((query) => query.data)
      .filter((event): event is NonNullable<typeof event> => !!event);

    return when2MeetEventsToCalendarEvents(events);
    // 'loadedMeetingsKey' describes which meetings are loaded and when, while
    // the query results array is recreated on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedMeetingsKey]);

  if (!enabled) {
    return NO_EVENTS;
  }

  return result;
}
