import { useMe } from "@/api/accounts/user.ts";
import { $when2meet } from "@/api/when2meet";
import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import { when2MeetEventsToCalendarEvents } from "./when2meet-events.ts";

export function useWhen2MeetCalendarEvents() {
  const { me } = useMe();
  const isEnabled = !!me?.id;

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

  return useMemo(() => {
    const events = meetingQueries
      .map((query) => query.data)
      .filter((event): event is NonNullable<typeof event> => !!event);

    return when2MeetEventsToCalendarEvents(events);
  }, [meetingQueries]);
}
