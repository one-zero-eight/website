import { useMyAcademicCalendar } from "@/lib/events/academic-calendar.tsx";
import { useEffect } from "react";
import { useLocalStorage } from "usehooks-ts";

export function AcademicCalendarWidget() {
  const [widgetShown, setWidgetShown] = useLocalStorage(
    "widget-academic-calendar",
    false,
  );

  const { academicCalendar, isPending } = useMyAcademicCalendar();

  useEffect(() => {
    setWidgetShown((v) => (v && isPending) || !!academicCalendar);
  }, [setWidgetShown, isPending, academicCalendar]);

  if (!academicCalendar) {
    if (!widgetShown) return null;
    return (
      <div className="group flex min-h-32 animate-pulse flex-row gap-4 rounded-2xl bg-primary px-4 py-6" />
    );
  }

  return (
    <div className="group flex flex-row gap-4 rounded-2xl bg-primary px-4 py-4">
      <span className="icon-[ph--books] hidden w-12 shrink-0 text-5xl text-brand-violet sm:block" />
      <div className="flex flex-col">
        <div className="flex text-lg font-semibold text-contrast">
          <span className="icon-[ph--books] mr-2 shrink-0 text-3xl text-brand-violet sm:hidden" />
          <academicCalendar.Title />
        </div>
        <div className="whitespace-pre-wrap text-contrast/75">
          <academicCalendar.Details />
        </div>
        <a
          href="https://eduwiki.innopolis.university/index.php/AcademicCalendar"
          className="w-fit text-sm text-contrast/75 hover:underline"
        >
          *based on <span className="text-brand-violet">Eduwiki</span>
          <span className="icon-[material-symbols--open-in-new-rounded] ml-1 text-xs" />
        </a>
      </div>
    </div>
  );
}
