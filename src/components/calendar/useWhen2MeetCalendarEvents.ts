import { useMe } from "@/api/accounts/user.ts";
import { $when2meet } from "@/api/when2meet";
import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import { when2MeetEventsToCalendarEvents } from "./when2meet-events.ts";

/** Query-aware form for consumers that must distinguish empty data from failure. */
export function useWhen2MeetCalendarData() {
  const { me } = useMe();
  const isEnabled = !!me?.id;
  const ownedQuery = $when2meet.useQuery(
    "get",
    "/meetings/",
    {},
    { enabled: isEnabled },
  );
  const participatingQuery = $when2meet.useQuery(
    "get",
    "/meetings/participating",
    {},
    { enabled: isEnabled },
  );

  const ownedMeetings = ownedQuery.data;
  const participatingMeetings = participatingQuery.data;
  const meetingSummaries = useMemo(() => {
    const bySlug = new Map<string, NonNullable<typeof ownedMeetings>[number]>();
    for (const meeting of [
      ...(ownedMeetings ?? []),
      ...(participatingMeetings ?? []),
    ]) {
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
  const meetings = useMemo(
    () => meetingQueries.flatMap((query) => (query.data ? [query.data] : [])),
    [meetingQueries],
  );
  const queries = [ownedQuery, participatingQuery, ...meetingQueries];
  const sourceIds = [
    "when2meet:owned",
    "when2meet:participating",
    ...meetingSummaries.map((meeting) => `when2meet:${meeting.slug}`),
  ];

  return {
    meetings,
    isPending: isEnabled && queries.some((query) => query.isPending),
    isError: queries.some((query) => query.isError),
    errors: queries.flatMap((query, index) =>
      query.isError ? [{ sourceId: sourceIds[index], error: query.error }] : [],
    ),
    refetch: async () => {
      if (isEnabled) await Promise.all(queries.map((query) => query.refetch()));
    },
  };
}

/** Backwards-compatible event-array API for the full calendar and overlays. */
export function useWhen2MeetCalendarEvents() {
  const { meetings } = useWhen2MeetCalendarData();
  return useMemo(() => when2MeetEventsToCalendarEvents(meetings), [meetings]);
}
