import { $events, eventsTypes } from "@/api/events";
import { useMySportAccessToken } from "@/api/helpers/sport-access-token.ts";
import { $sport } from "@/api/sport";
import { Calendar } from "@/components/calendar/Calendar.tsx";
import { URLType } from "@/components/calendar/CalendarViewer.tsx";
import {
  filterUpcomingCheckedInSchedule,
  fromCalendarSpace,
  trainingScheduleToCalendarEvent,
} from "@/components/sport/sport-calendar-events.ts";
import { toScheduleApiDateTime } from "@/components/sport/sport-week-utils.ts";
import {
  getICSLink,
  getMyMoodleLink,
  getMyMusicRoomLink,
  getMyRoomBookingsLink,
  getMyWorkshopsLink,
} from "@/api/events/links.ts";
import type { EventInput } from "@fullcalendar/core";
import { useMemo, useRef, useState } from "react";

export function CalendarPage() {
  const { data: eventsUser } = $events.useQuery("get", "/users/me");
  const { data: eventGroups } = $events.useQuery("get", "/event-groups/");
  const { data: predefined } = $events.useQuery("get", "/users/me/predefined");
  const [sportToken] = useMySportAccessToken();
  const [visibleRange, setVisibleRange] = useState<{
    start: Date;
    end: Date;
  } | null>(null);

  const initialWidth = useRef(window.innerWidth);

  const includeSportSchedule =
    eventsUser?.sports_hidden === false && !!sportToken;

  const scheduleQuery = useMemo(() => {
    if (!visibleRange) {
      return null;
    }

    const start = fromCalendarSpace(visibleRange.start);
    const end = fromCalendarSpace(visibleRange.end);
    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate() + 1);

    return {
      start: toScheduleApiDateTime(start),
      end: toScheduleApiDateTime(end),
    };
  }, [visibleRange]);

  const { data: sportSchedule } = $sport.useQuery(
    "get",
    "/users/me/schedule",
    {
      params: {
        query: {
          start: scheduleQuery?.start ?? "",
          end: scheduleQuery?.end ?? "",
        },
      },
    },
    { enabled: includeSportSchedule && scheduleQuery != null },
  );

  const sportEvents = useMemo((): EventInput[] => {
    if (!includeSportSchedule) {
      return [];
    }

    return filterUpcomingCheckedInSchedule(sportSchedule ?? []).map(
      trainingScheduleToCalendarEvent,
    );
  }, [includeSportSchedule, sportSchedule]);

  return (
    <div className="grow overflow-hidden">
      <Calendar
        urls={
          eventsUser?.favorite_event_groups === undefined ||
          eventsUser?.hidden_event_groups === undefined ||
          predefined === undefined ||
          eventGroups === undefined
            ? []
            : getCalendarsToShow(
                eventsUser.favorite_event_groups,
                eventsUser.hidden_event_groups,
                predefined.event_groups,
                eventGroups,
                eventsUser.id,
                eventsUser.music_room_hidden,
                eventsUser.moodle_hidden,
              )
        }
        sportEvents={sportEvents}
        onVisibleRangeChange={setVisibleRange}
        initialView={
          initialWidth.current
            ? initialWidth.current >= 1280
              ? "dayGridMonth"
              : initialWidth.current >= 1024
                ? "timeGridWeek"
                : "listMonth"
            : "dayGridMonth"
        }
        viewId="page"
        isFullPage={true}
      />
    </div>
  );
}

function getCalendarsToShow(
  favorites: number[],
  hidden: number[],
  predefined: number[],
  eventGroups: eventsTypes.SchemaListEventGroupsResponse,
  userId: number | undefined,
  music_room_hidden: boolean,
  moodle_hidden: boolean,
): URLType[] {
  const toShow: URLType[] = favorites.concat(predefined).flatMap((v) => {
    if (hidden.includes(v)) return [];
    const group = eventGroups.event_groups.find((group) => group.id === v);
    if (!group) return [];
    return [{ url: getICSLink(group.alias, userId), eventGroup: group }];
  });

  if (!music_room_hidden) {
    toShow.push({
      url: getMyMusicRoomLink(),
      color: "seagreen",
      sourceLink: "https://t.me/InnoMusicRoomBot",
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
    url: getMyWorkshopsLink(),
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

  return toShow.filter((value, index, array) => array.indexOf(value) === index);
}
