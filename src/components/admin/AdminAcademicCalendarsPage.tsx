import { AcademicCalendarCard } from "@/components/dashboard/AcademicCalendarWidget.tsx";
import { academicCalendar } from "@/components/dashboard/academic-calendar.tsx";

export function AdminAcademicCalendarsPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4">
      {academicCalendar.map((calendar) => (
        <div key={calendar.groupPrefix} className="flex flex-col gap-2">
          <dl className="text-base-content/75 grid gap-1 font-mono text-sm">
            <div className="flex min-w-0 gap-2">
              <dt className="shrink-0">groupPrefix</dt>
              <dd className="truncate">{calendar.groupPrefix}</dd>
            </div>
            <div className="flex min-w-0 gap-2">
              <dt className="shrink-0">startDate</dt>
              <dd>{calendar.startDate}</dd>
            </div>
            <div className="flex min-w-0 gap-2">
              <dt className="shrink-0">endDate</dt>
              <dd>{calendar.endDate}</dd>
            </div>
          </dl>
          <AcademicCalendarCard academicCalendar={calendar} />
        </div>
      ))}
    </div>
  );
}
