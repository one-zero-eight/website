import { $events } from "@/api/events";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { getPersonalCalendarIcsUrls } from "./utils/personal-calendar-urls.ts";
import {
  buildCalendarSlotOverlay,
  fetchPersonalCalendarEvents,
  getMeetingCalendarRange,
} from "./utils/calendar-overlay.ts";

export function useWhen2MeetPersonalCalendarOverlay({
  dateIds,
  timeSlots,
  allowedSlots,
  enabled,
}: {
  dateIds: string[];
  timeSlots: string[];
  allowedSlots?: Set<string>;
  enabled: boolean;
}) {
  const { data: eventsUser } = $events.useQuery(
    "get",
    "/users/me",
    {},
    { enabled },
  );
  const { data: eventGroups } = $events.useQuery(
    "get",
    "/event-groups/",
    {},
    { enabled },
  );
  const { data: predefined } = $events.useQuery(
    "get",
    "/users/me/predefined",
    {},
    { enabled },
  );

  const calendarUrls = useMemo(() => {
    if (
      !eventsUser ||
      !eventGroups ||
      !predefined ||
      eventsUser.favorite_event_groups === undefined ||
      eventsUser.hidden_event_groups === undefined
    ) {
      return [];
    }

    return getPersonalCalendarIcsUrls({
      favorites: eventsUser.favorite_event_groups,
      hidden: eventsUser.hidden_event_groups,
      predefined: predefined.event_groups,
      eventGroups,
      userId: eventsUser.id,
      musicRoomHidden: eventsUser.music_room_hidden,
      sportsHidden: eventsUser.sports_hidden,
      moodleHidden: eventsUser.moodle_hidden,
    });
  }, [eventsUser, eventGroups, predefined]);

  const meetingRange = useMemo(
    () => getMeetingCalendarRange(dateIds),
    [dateIds],
  );

  const { data: calendarEvents = [], isPending } = useQuery({
    queryKey: [
      "when2meet",
      "personal-calendar-overlay",
      calendarUrls,
      meetingRange?.start.toISOString(),
      meetingRange?.end.toISOString(),
    ],
    queryFn: () =>
      fetchPersonalCalendarEvents(
        calendarUrls,
        meetingRange!.start,
        meetingRange!.end,
      ),
    enabled: enabled && !!meetingRange && calendarUrls.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const slotEvents = useMemo(
    () =>
      buildCalendarSlotOverlay(
        calendarEvents,
        dateIds,
        timeSlots,
        allowedSlots,
      ),
    [calendarEvents, dateIds, timeSlots, allowedSlots],
  );

  return {
    slotEvents,
    isPending,
    hasCalendarData: slotEvents.size > 0,
  };
}
