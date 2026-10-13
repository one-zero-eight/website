import {
  AcademicCalendar,
  useMyAcademicCalendar,
} from "@/components/dashboard/academic-calendar.tsx";
import { useState } from "react";

export function AcademicCalendarCard({
  academicCalendar,
}: {
  academicCalendar: AcademicCalendar;
}) {
  return (
    <div className="group bg-base-200 rounded-box flex flex-row gap-4 px-4 py-4">
      <span className="icon-[ph--books] text-primary hidden w-12 shrink-0 text-5xl sm:block" />
      <div className="flex flex-col">
        <div className="text-base-content flex text-lg font-semibold">
          <span className="icon-[ph--books] text-primary mr-2 shrink-0 text-3xl sm:hidden" />
          <academicCalendar.Title />
        </div>
        <div className="text-base-content/75 whitespace-pre-wrap">
          <academicCalendar.Details />
        </div>
        <a
          href="https://eduwiki.innopolis.university/index.php/AcademicCalendar"
          className="text-base-content/75 w-fit text-sm hover:underline"
        >
          *based on <span className="text-primary">Eduwiki</span>
          <span className="icon-[material-symbols--open-in-new-rounded] ml-1 text-xs" />
        </a>
      </div>
    </div>
  );
}

export function AcademicCalendarWidget() {
  const { academicCalendar, isPending, isError, refetch } =
    useMyAcademicCalendar();
  const [isRetrying, setIsRetrying] = useState(false);

  async function handleRetry() {
    setIsRetrying(true);
    try {
      await refetch();
    } finally {
      setIsRetrying(false);
    }
  }

  if (academicCalendar) {
    return <AcademicCalendarCard academicCalendar={academicCalendar} />;
  }

  if (isPending && !isError) {
    return <div className="skeleton rounded-box min-h-32" />;
  }

  return (
    <section className="bg-base-200 rounded-box flex min-w-0 gap-4 p-4">
      <span className="icon-[ph--books] text-primary size-8 shrink-0" />
      <div className="flex min-w-0 flex-col gap-2">
        <h2 className="text-lg font-semibold">Academic calendar</h2>
        {isError ? (
          <div className="text-error flex flex-wrap items-center gap-2 text-sm">
            <span>Could not load your academic calendar.</span>
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              disabled={isRetrying}
              onClick={() => void handleRetry()}
            >
              {isRetrying ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                "Retry"
              )}
            </button>
          </div>
        ) : (
          <p className="text-base-content/60 text-sm">
            No academic calendar found for your study group.
          </p>
        )}
        <a
          href="https://eduwiki.innopolis.university/index.php/AcademicCalendar"
          className="text-primary w-fit text-sm hover:underline"
        >
          View academic calendar on Eduwiki
          <span className="icon-[material-symbols--open-in-new-rounded] ml-1 text-xs" />
        </a>
      </div>
    </section>
  );
}
