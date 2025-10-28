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
      <div className="group bg-primary flex min-h-32 animate-pulse flex-row gap-4 rounded-2xl px-4 py-6" />
    );
  }

  return (
    <div className="group bg-primary flex flex-row gap-4 rounded-2xl px-4 py-4">
      <span className="icon-[ph--books] text-brand-violet hidden w-12 shrink-0 text-5xl sm:block" />
      <div className="flex flex-col">
        <div className="text-contrast flex text-lg font-semibold">
          <span className="icon-[ph--books] text-brand-violet mr-2 shrink-0 text-3xl sm:hidden" />
          <academicCalendar.Title />
        </div>
        <div className="text-contrast/75 whitespace-pre-wrap">
          <academicCalendar.Details />
        </div>
        <a
          href="https://eduwiki.innopolis.university/index.php/AcademicCalendar"
          className="text-contrast/75 w-fit text-sm hover:underline"
        >
          *based on <span className="text-brand-violet">Eduwiki</span>
          <span className="icon-[material-symbols--open-in-new-rounded] ml-1 text-xs" />
        </a>
      </div>
    </div>
  );
}
