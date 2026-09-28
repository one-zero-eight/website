import { $schedule } from "@/api/schedule";
import { $sport } from "@/api/sport";
import { Calendar } from "@/components/calendar/Calendar.tsx";
import {
  filterUpcomingCheckedInSchedule,
  fromCalendarSpace,
  trainingScheduleToCalendarEvent,
} from "@/components/sport/sport-calendar-events.ts";
import { toScheduleApiDateTime } from "@/components/sport/sport-week-utils.ts";
import { calendarSourceToUrl, getCalendarSources } from "./calendar-sources.ts";
import { useWhen2MeetCalendarEvents } from "./useWhen2MeetCalendarEvents.ts";
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
          !scheduleUser || !predefined || !eventGroups
            ? []
            : getCalendarSources(
                scheduleUser,
                predefined.event_groups,
                eventGroups,
                // Sport trainings come from the sport API as extra events below.
                { excludeSport: true },
              ).map(calendarSourceToUrl)
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
