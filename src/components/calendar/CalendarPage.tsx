import { Calendar } from "@/components/calendar/Calendar.tsx";
import { useRef } from "react";

export function CalendarPage() {
  const initialWidth = useRef(window.innerWidth);

  return (
    <div className="grow overflow-hidden">
      <Calendar
        config={{
          includeFullPersonalCalendar: true,
          includePersonalWhen2meet: true,
          includePersonalSport: true,
        }}
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
