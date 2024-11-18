import { $events } from "@/api/events";
import { findAcademicCalendarByGroups } from "@/lib/events/academic-calendar.tsx";

export function AcademicCalendarWidget() {
  const { data: eventGroups } = $events.useQuery("get", "/event-groups/");
  const { data: predefined } = $events.useQuery("get", "/users/me/predefined");

  if (!eventGroups || !predefined) return null;

  const groups = predefined.event_groups
    .map((v) => eventGroups.event_groups.find((g) => g.id === v)?.name)
    .filter((v) => v) as string[];
  const academicCalendar = findAcademicCalendarByGroups(groups);

  if (!academicCalendar) return null;

  return (
    <div className="group flex flex-row gap-4 rounded-2xl bg-primary-main px-4 py-6">
      <div className="w-12">
        <span className="icon-[ph--books] text-5xl text-brand-violet" />
      </div>
      <div className="flex flex-col">
        <div className="text-2xl font-semibold text-text-main">
          <academicCalendar.Title />
        </div>
        <div className="mt-2 whitespace-pre-wrap text-lg text-text-secondary/75">
          <academicCalendar.Details />
        </div>
        <a
          href="https://eduwiki.innopolis.university/index.php/AcademicCalendar"
          className="text-base text-text-secondary/75 hover:underline"
        >
          *based on <span className="text-brand-violet">Eduwiki</span>.
        </a>
      </div>
    </div>
  );
}
