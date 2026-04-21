import { $sport } from "@/api/sport";
import type { SchemaTrainingInfoPersonalSchema } from "@/api/sport/types.ts";
import { SportTrainingModal } from "@/components/sport/SportTrainingModal.tsx";
import {
  endOfSportWeekMoscow,
  formatDayHeaderMoscow,
  formatSportWeekRangeLabel,
  formatTimeRangeMoscow,
  moscowDateKey,
  startOfSportWeekMoscow,
  toScheduleApiDateTime,
} from "@/components/sport/sport-week-utils.ts";
import { sportTrainingTitle } from "@/components/sport/sport-training-label.ts";
import { useMemo, useState } from "react";

export function SportScheduleSection({
  enabled,
  studentId,
}: {
  enabled: boolean;
  studentId: number;
}) {
  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const [selected, setSelected] =
    useState<SchemaTrainingInfoPersonalSchema | null>(null);

  const monday = useMemo(
    () => startOfSportWeekMoscow(weekAnchor),
    [weekAnchor],
  );
  const sundayEnd = useMemo(() => endOfSportWeekMoscow(monday), [monday]);

  const {
    data: schedule,
    isPending,
    isError,
  } = $sport.useQuery(
    "get",
    "/users/me/schedule",
    {
      params: {
        query: {
          start: toScheduleApiDateTime(monday),
          end: toScheduleApiDateTime(sundayEnd),
        },
      },
    },
    { enabled },
  );

  const byDay = useMemo(() => {
    const map = new Map<string, SchemaTrainingInfoPersonalSchema[]>();
    for (const row of schedule ?? []) {
      const key = moscowDateKey(row.training.start);
      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) =>
          new Date(a.training.start).getTime() -
          new Date(b.training.start).getTime(),
      );
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [schedule]);

  const rangeLabel = formatSportWeekRangeLabel(monday, sundayEnd);

  function shiftWeek(delta: number) {
    setWeekAnchor((d) => {
      const m = startOfSportWeekMoscow(d);
      return new Date(m.getTime() + delta * 7 * 24 * 3600 * 1000);
    });
  }

  return (
    <>
      <div className="card card-border bg-base-100">
        <div className="card-body gap-5 @md/content:gap-6">
          <header className="border-base-300 bg-base-200/50 rounded-box flex flex-col gap-5 border p-4 @md/content:p-6">
            <div className="flex flex-col gap-4 @lg/content:flex-row @lg/content:items-center @lg/content:justify-between">
              <div className="flex items-start gap-4">
                <div
                  className="bg-primary/15 text-primary rounded-box flex size-14 shrink-0 items-center justify-center @md/content:size-16"
                  aria-hidden
                >
                  <span className="icon-[material-symbols--calendar-month-outline] text-4xl @md/content:text-[2.5rem]" />
                </div>
                <div className="min-w-0 pt-0.5">
                  <h3 className="text-2xl font-medium tracking-tight @md/content:text-3xl">
                    Schedule
                  </h3>
                  <p className="text-base-content/65 mt-1 text-base leading-snug">
                    Tap a session to view details or check in.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-primary shrink-0 self-start @lg/content:self-center"
                onClick={() => setWeekAnchor(new Date())}
              >
                <span className="icon-[material-symbols--today-outline] text-xl" />
                This week
              </button>
            </div>

            <div
              className="border-base-300/80 flex flex-col gap-3 border-t pt-5"
              role="group"
              aria-label="Week navigation"
            >
              <p className="text-base-content/55 text-center text-sm font-medium tracking-wide uppercase">
                Week of
              </p>
              <div className="border-base-300 bg-base-100 mx-auto flex w-full max-w-xl items-stretch overflow-hidden rounded-xl border shadow-sm">
                <button
                  type="button"
                  className="btn btn-ghost border-base-300 h-auto min-h-14 min-w-14 shrink-0 rounded-none border-r px-0 text-2xl @md/content:min-h-16 @md/content:min-w-16"
                  aria-label="Previous week"
                  onClick={() => shiftWeek(-1)}
                >
                  <span className="icon-[material-symbols--chevron-left]" />
                </button>
                <div className="flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center px-3 py-3 @md/content:min-h-16 @md/content:px-6">
                  <p className="text-center text-lg font-semibold tracking-tight @md/content:text-2xl">
                    {rangeLabel}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost border-base-300 h-auto min-h-14 min-w-14 shrink-0 rounded-none border-l px-0 text-2xl @md/content:min-h-16 @md/content:min-w-16"
                  aria-label="Next week"
                  onClick={() => shiftWeek(1)}
                >
                  <span className="icon-[material-symbols--chevron-right]" />
                </button>
              </div>
            </div>
          </header>

          {isPending ? (
            <div className="bg-base-200 rounded-box h-56 animate-pulse" />
          ) : isError ? (
            <p className="text-base-content/70 text-base leading-relaxed">
              Schedule could not be loaded. In local dev, requests use the Vite
              proxy; a 500 means the sport API returned an error for this range.
            </p>
          ) : byDay.length === 0 ? (
            <p className="text-base-content/70 text-base leading-relaxed">
              No trainings in this week.
            </p>
          ) : (
            <div className="flex flex-col gap-6 @md/content:gap-8">
              {byDay.map(([dateKey, rows]) => {
                const header = formatDayHeaderMoscow(rows[0]!.training.start);
                return (
                  <section
                    key={dateKey}
                    aria-labelledby={`sport-day-${dateKey}`}
                    className="border-base-300 bg-base-100 rounded-box overflow-hidden border-2 shadow-sm"
                  >
                    <div
                      id={`sport-day-${dateKey}`}
                      className="bg-base-200/90 border-base-300 flex flex-col gap-1 border-b-2 px-4 py-4 @sm/content:flex-row @sm/content:items-end @sm/content:justify-between @sm/content:gap-4"
                    >
                      <span className="text-xl font-semibold tracking-tight @md/content:text-2xl">
                        {header.weekday}
                      </span>
                      <span className="text-base-content/75 text-base font-medium @md/content:text-lg">
                        {header.long}
                      </span>
                    </div>
                    <ul className="divide-base-300/90 flex flex-col divide-y-2">
                      {rows.map((row) => {
                        const t = row.training;
                        const title = sportTrainingTitle(row);
                        return (
                          <li key={t.id}>
                            <button
                              type="button"
                              className="hover:bg-base-200/80 text-base-content bg-base-100 flex min-h-[3.75rem] w-full flex-row items-center gap-3 px-4 py-4 text-left transition-colors @sm/content:gap-5 @sm/content:px-5 @sm/content:py-4"
                              onClick={() => setSelected(row)}
                            >
                              <div className="w-[38%] shrink-0 text-base font-bold tracking-tight tabular-nums @sm/content:w-[30%] @sm/content:text-lg">
                                {t.is_club ? (
                                  <span
                                    className="border-base-content/35 mr-2 inline-block size-2.5 shrink-0 rounded-full border-2 border-solid align-middle"
                                    aria-hidden
                                  />
                                ) : null}
                                {formatTimeRangeMoscow(t.start, t.end)}
                              </div>
                              <div className="border-base-300 flex min-w-0 flex-1 items-center border-l-2 pl-4 @sm/content:pl-5">
                                <span className="text-base leading-snug font-semibold wrap-break-word @sm/content:text-lg">
                                  {title}
                                </span>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <SportTrainingModal
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        row={selected}
        studentId={studentId}
      />
    </>
  );
}
