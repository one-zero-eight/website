import { EventInput } from "@fullcalendar/core";
import FullCalendar from "@fullcalendar/react";
import { lazy, RefObject, Suspense } from "react";
import "@/components/calendar/styles-calendar.css";

const TvCalendarViewer = lazy(() => import("./TvCalendarViewer.tsx"));

export function TvCalendar({
  events,
  start,
  end,
  isLoading,
  isError,
  scrollTime,
  calendarRef,
}: {
  events: EventInput[];
  start: Date;
  end: Date;
  isLoading: boolean;
  isError: boolean;
  scrollTime: string;
  calendarRef: RefObject<FullCalendar | null>;
}) {
  return (
    <Suspense>
      <TvCalendarViewer
        events={events}
        start={start}
        end={end}
        isLoading={isLoading}
        isError={isError}
        scrollTime={scrollTime}
        calendarRef={calendarRef}
      />
    </Suspense>
  );
}
