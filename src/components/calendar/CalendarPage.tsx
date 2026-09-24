import { $schedule, scheduleTypes } from "@/api/schedule";
import { $sport } from "@/api/sport";
import { Calendar } from "@/components/calendar/Calendar.tsx";
import { URLType } from "@/components/calendar/CalendarViewer.tsx";
import {
  filterUpcomingCheckedInSchedule,
  fromCalendarSpace,
  trainingScheduleToCalendarEvent,
} from "@/components/sport/sport-calendar-events.ts";
import { toScheduleApiDateTime } from "@/components/sport/sport-week-utils.ts";
import { useWhen2MeetCalendarEvents } from "@/components/calendar/useWhen2MeetCalendarEvents.ts";
import {
  getImportedLink,
  getICSLink,
  getMyMoodleLink,
  getMyMusicRoomLink,
  getMyRoomBookingsLink,
  getMyWorkshopsLink,
} from "@/api/schedule/links.ts";
import { SchemaLinkedCalendarView } from "@/api/schedule/types.ts";
import type { EventInput } from "@fullcalendar/core";
import { useMemo, useRef, useState } from "react";

export function CalendarPage() {
  const { data: scheduleUser } = $schedule.useQuery("get", "/users/me");
  const { data: eventGroups } = $schedule.useQuery("get", "/event-groups/");
  const { data: predefined } = $schedule.useQuery(
    "get",
    "/users/me/predefined",
  );
  const when2MeetEvents = useWhen2MeetCalendarEvents();
  const [visibleRange, setVisibleRange] = useState<{
    start: Date;
    end: Date;
  } | null>(null);

  const initialWidth = useRef(window.innerWidth);

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
    { enabled: scheduleUser?.sports_hidden === false && scheduleQuery != null },
  );

  const sportEvents = useMemo((): EventInput[] => {
    if (scheduleUser?.sports_hidden !== false) {
      return [];
    }

    return filterUpcomingCheckedInSchedule(sportSchedule ?? []).map(
      trainingScheduleToCalendarEvent,
    );
  }, [scheduleUser?.sports_hidden, sportSchedule]);

  return (
    <div className="grow overflow-hidden">
      <Calendar
        extraEvents={when2MeetEvents}
        urls={
          scheduleUser?.favorite_event_groups === undefined ||
          scheduleUser?.hidden_event_groups === undefined ||
          predefined === undefined ||
          eventGroups === undefined
            ? []
            : getCalendarsToShow(
                scheduleUser.favorite_event_groups,
                scheduleUser.hidden_event_groups,
                predefined.event_groups,
                eventGroups,
                scheduleUser.id,
                scheduleUser.music_room_hidden,
                scheduleUser.moodle_hidden,
                Object.values(scheduleUser.linked_calendars || {}),
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
        viewStorageId="page"
        isFullPage={true}
      />
    </div>
  );
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
): URLType[] {
  const visibleAliases = new Set(
    favorites.concat(predefined).filter((alias) => !hidden.includes(alias)),
  );
  const hasAssistantEnglish = [...visibleAliases].some((alias) =>
    alias.startsWith("english-"),
  );

  // Remove hidden calendars
  const toShow: URLType[] = [...visibleAliases].flatMap((alias) => {
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
