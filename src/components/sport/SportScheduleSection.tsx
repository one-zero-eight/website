import { $sport } from "@/api/sport";
import type { SchemaTrainingInfoPersonalSchema } from "@/api/sport/types.ts";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/ui/cn";
import { SportTrainingModal } from "@/components/sport/SportTrainingModal.tsx";
import {
  endOfSportWeekMoscow,
  formatDayHeaderMoscow,
  formatTimeRangeMoscow,
  moscowDateKey,
  startOfSportWeekMoscow,
  toScheduleApiDateTime,
} from "@/components/sport/sport-week-utils.ts";
import { sportTrainingTitle } from "@/components/sport/sport-training-label.ts";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

const legacyGroupColors = [
  "#1f77b4",
  "#ff7f0e",
  "#2ca02c",
  "#d62728",
  "#9467bd",
  "#8c564b",
  "#b4005a",
  "#7f7f7f",
  "#7b7c1f",
  "#157786",
] as const;

const scheduleDays = [0, 1, 2, 3, 4, 5, 6] as const;

function invalidateSportSchedule(client: ReturnType<typeof useQueryClient>) {
  return client.invalidateQueries({
    predicate: (q) =>
      Array.isArray(q.queryKey) &&
      q.queryKey[0] === "sport" &&
      (q.queryKey[2] === "/users/me/schedule" ||
        q.queryKey[2] === "/sports/{sport_id}/schedule"),
  });
}

function invalidateStudentHours(
  client: ReturnType<typeof useQueryClient>,
  studentId: number,
) {
  return client.invalidateQueries({
    queryKey: $sport.queryOptions(
      "get",
      "/students/{student_id}/hours-summary",
      { params: { path: { student_id: studentId } } },
    ).queryKey,
  });
}

export function SportScheduleSection({
  enabled,
  studentId,
}: {
  enabled: boolean;
  studentId: number;
}) {
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useToast();
  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const [pendingTrainingId, setPendingTrainingId] = useState<number | null>(
    null,
  );
  const [checkinOverrides, setCheckinOverrides] = useState<
    Record<number, boolean>
  >({});
  const [selected, setSelected] =
    useState<SchemaTrainingInfoPersonalSchema | null>(null);

  const monday = useMemo(
    () => startOfSportWeekMoscow(weekAnchor),
    [weekAnchor],
  );
  const sundayEnd = useMemo(() => endOfSportWeekMoscow(monday), [monday]);
  const visibleDayIndexes = useMemo(
    () => getVisibleDayIndexesForWeek(monday),
    [monday],
  );

  const {
    data: personalSchedule,
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

  const checkedTrainingIds = useMemo(() => {
    const ids = new Set<number>();

    for (const row of personalSchedule ?? []) {
      if (row.checked_in) {
        ids.add(row.training.id);
      }
    }

    for (const [trainingId, checkedIn] of Object.entries(checkinOverrides)) {
      if (checkedIn) {
        ids.add(Number(trainingId));
      } else {
        ids.delete(Number(trainingId));
      }
    }

    return ids;
  }, [checkinOverrides, personalSchedule]);

  const { mutate: setCheckin } = $sport.useMutation(
    "post",
    "/trainings/{training_id}/checkin",
    {
      onSuccess: async (_, vars) => {
        const trainingId = vars.params.path.training_id;
        const checkin = vars.params.query.checkin;

        setCheckinOverrides((overrides) => ({
          ...overrides,
          [trainingId]: checkin,
        }));
        await Promise.all([
          invalidateSportSchedule(queryClient),
          invalidateStudentHours(queryClient, studentId),
        ]);
        showSuccess(
          checkin ? "Checked in" : "Checked out",
          checkin
            ? "You are signed up for this training."
            : "You are no longer signed up.",
        );
      },
      onError: () => {
        showError(
          "Could not update check-in",
          "Please try again or use the Telegram bot.",
        );
      },
      onSettled: () => setPendingTrainingId(null),
    },
  );

  const filteredSchedule = useMemo(() => {
    return (personalSchedule ?? [])
      .filter((row) => row.training.max_checkins > 0)
      .toSorted(
        (a, b) =>
          new Date(a.training.start).getTime() -
          new Date(b.training.start).getTime(),
      );
  }, [personalSchedule]);

  const groupColorMap = useMemo(() => {
    const map = new Map<string, string>();
    let colorIndex = 0;

    for (const row of personalSchedule ?? []) {
      const key = getTrainingColorKey(row.training);
      if (map.has(key)) {
        continue;
      }

      map.set(
        key,
        legacyGroupColors[colorIndex] ?? getGeneratedColor(colorIndex),
      );
      colorIndex += 1;
    }

    return map;
  }, [personalSchedule]);

  const byDay = useMemo(() => {
    const map = new Map<string, SchemaTrainingInfoPersonalSchema[]>();

    for (const row of filteredSchedule) {
      const key = moscowDateKey(row.training.start);
      map.set(key, [...(map.get(key) ?? []), row]);
    }

    return map;
  }, [filteredSchedule]);
  const visibleTrainingCount = useMemo(() => {
    return visibleDayIndexes.reduce((count, dayIndex) => {
      const key = moscowDateKey(addDays(monday, dayIndex).toISOString());
      return count + (byDay.get(key)?.length ?? 0);
    }, 0);
  }, [byDay, monday, visibleDayIndexes]);

  function shiftWeek(delta: number) {
    setWeekAnchor((d) => {
      const weekStart = startOfSportWeekMoscow(d);
      return new Date(weekStart.getTime() + delta * 7 * 24 * 3600 * 1000);
    });
  }

  function handleCheckin(
    training: SchemaTrainingInfoPersonalSchema["training"],
    checkin: boolean,
  ) {
    setPendingTrainingId(training.id);
    setCheckin({
      params: {
        path: { training_id: training.id },
        query: { checkin },
      },
    });
  }

  return (
    <>
      <div className="border-base-300 bg-base-100 border-t pt-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-row items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-3xl font-medium">Schedule</h2>
            </div>
          </div>

          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setWeekAnchor(new Date())}
            >
              today
            </button>
            <div className="join">
              <button
                type="button"
                className="btn btn-outline btn-primary btn-sm join-item"
                onClick={() => shiftWeek(-1)}
              >
                <span className="icon-[material-symbols--chevron-left] text-lg" />
              </button>
              <button
                type="button"
                className="btn btn-outline btn-primary btn-sm join-item"
                onClick={() => shiftWeek(1)}
              >
                <span className="icon-[material-symbols--chevron-right] text-lg" />
              </button>
            </div>
          </div>

          {isPending ? (
            <div className="skeleton h-96 w-full" />
          ) : isError ? (
            <div className="alert alert-error">
              Schedule could not be loaded.
            </div>
          ) : visibleTrainingCount === 0 ? (
            <div className="text-base-content/70 rounded-box border-base-300 border p-4">
              No trainings match the selected filters.
            </div>
          ) : (
            <SportScheduleList
              byDay={byDay}
              monday={monday}
              visibleDayIndexes={visibleDayIndexes}
              groupColorMap={groupColorMap}
              checkedTrainingIds={checkedTrainingIds}
              pendingTrainingId={pendingTrainingId}
              onSelect={(row) =>
                setSelected(
                  toSelectedTrainingRow(
                    row,
                    checkedTrainingIds.has(row.training.id),
                  ),
                )
              }
              onCheckin={handleCheckin}
            />
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

function SportScheduleList({
  byDay,
  monday,
  visibleDayIndexes,
  groupColorMap,
  checkedTrainingIds,
  pendingTrainingId,
  onSelect,
  onCheckin,
}: {
  byDay: Map<string, SchemaTrainingInfoPersonalSchema[]>;
  monday: Date;
  visibleDayIndexes: readonly number[];
  groupColorMap: Map<string, string>;
  checkedTrainingIds: Set<number>;
  pendingTrainingId: number | null;
  onSelect: (row: SchemaTrainingInfoPersonalSchema) => void;
  onCheckin: (
    training: SchemaTrainingInfoPersonalSchema["training"],
    checkin: boolean,
  ) => void;
}) {
  return (
    <div className="border-base-300 overflow-hidden border">
      {visibleDayIndexes.map((index) => {
        const date = addDays(monday, index);
        const key = moscowDateKey(date.toISOString());
        const rows = byDay.get(key) ?? [];
        const header = formatDayHeaderMoscow(date.toISOString());

        return (
          <section key={key}>
            <div className="border-base-300 bg-base-200 flex min-h-9 items-center justify-between gap-3 border-b px-3 py-1.5">
              <span className="text-base font-bold">{header.weekday}</span>
              <span className="text-base font-bold">
                {formatOriginalDate(date)}
              </span>
            </div>

            {rows.length ? (
              <ul>
                {rows.map((row) => {
                  const training = row.training;
                  const checkedIn = checkedTrainingIds.has(training.id);
                  const availablePlaces = getAvailablePlaces(training);
                  const canCheckIn = checkedIn || row.can_check_in;
                  const isPending = pendingTrainingId === training.id;

                  return (
                    <li key={training.id}>
                      <div
                        className="grid min-h-10 w-full grid-cols-[9.5rem_minmax(0,1fr)_auto] items-center gap-2 border-b border-white/30 px-3 py-1 text-left text-base font-bold text-white @max-md/content:grid-cols-[8.5rem_minmax(0,1fr)] @max-sm/content:grid-cols-1"
                        style={{
                          backgroundColor: getTrainingColor(
                            training,
                            groupColorMap,
                            checkedIn,
                            canCheckIn,
                          ),
                        }}
                      >
                        <button
                          type="button"
                          className="flex min-h-8 items-center text-left tabular-nums"
                          onClick={() => onSelect(row)}
                        >
                          {formatTimeRangeMoscow(training.start, training.end)}
                        </button>
                        <button
                          type="button"
                          className="flex min-h-8 min-w-0 items-center text-left wrap-break-word"
                          onClick={() => onSelect(row)}
                        >
                          {sportTrainingTitle({ training })}
                          {training.is_paid ? (
                            <span className="ml-2 inline-block rounded-full border border-[#f1c40f] bg-[#f1c40f] px-1.5 py-0.5 align-middle text-[0.625rem] leading-none font-bold text-black uppercase">
                              Paid
                            </span>
                          ) : null}
                        </button>
                        <div className="flex shrink-0 items-center justify-end gap-2 @max-md/content:col-span-2 @max-md/content:justify-start @max-sm/content:col-span-1">
                          <span className="text-sm whitespace-nowrap">
                            {availablePlaces}/{training.max_checkins}
                          </span>
                          <button
                            type="button"
                            className={cn(
                              "btn btn-xs min-w-24",
                              checkedIn
                                ? "border-error bg-base-200 text-error hover:border-error hover:bg-base-300"
                                : !canCheckIn
                                  ? "bg-white/90 text-gray-400 hover:bg-white hover:text-gray-400"
                                  : "bg-white/90 text-black hover:bg-white",
                            )}
                            disabled={isPending || (!checkedIn && !canCheckIn)}
                            onClick={() => onCheckin(training, !checkedIn)}
                          >
                            {isPending ? (
                              <span className="loading loading-spinner loading-sm" />
                            ) : checkedIn ? (
                              "Check out"
                            ) : !canCheckIn ? (
                              "Unavailable"
                            ) : (
                              "Check-in"
                            )}
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="text-base-content/50 border-base-300 border-b px-3 py-3 text-sm">
                No trainings
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function toSelectedTrainingRow(
  row: SchemaTrainingInfoPersonalSchema,
  checkedIn: boolean,
): SchemaTrainingInfoPersonalSchema {
  return {
    ...row,
    checked_in: checkedIn,
    can_check_in: checkedIn || row.can_check_in,
  };
}

function getTrainingColorKey(
  training: SchemaTrainingInfoPersonalSchema["training"],
): string {
  return String(training.group_id || training.display_name || training.id);
}

function getGeneratedColor(index: number): string {
  const hue = (index * 137) % 360;
  return `hsl(${hue} 62% 42%)`;
}

function getTrainingColor(
  training: SchemaTrainingInfoPersonalSchema["training"],
  groupColorMap: Map<string, string>,
  checkedIn: boolean,
  canCheckIn: boolean,
): string {
  if (checkedIn) {
    return "#28a745";
  }

  if (!canCheckIn) {
    return "#dc3545";
  }

  return (
    groupColorMap.get(getTrainingColorKey(training)) ?? legacyGroupColors[0]
  );
}

function getAvailablePlaces(
  training: SchemaTrainingInfoPersonalSchema["training"],
): number {
  const places = training.max_checkins - training.checkins_count;
  return Math.max(0, places);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 3600 * 1000);
}

function formatOriginalDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "Europe/Moscow",
  });
}

function getVisibleDayIndexesForWeek(monday: Date): readonly number[] {
  const currentWeekMonday = startOfSportWeekMoscow(new Date());

  if (
    moscowDateKey(monday.toISOString()) !==
    moscowDateKey(currentWeekMonday.toISOString())
  ) {
    return scheduleDays;
  }

  const todayKey = moscowDateKey(new Date().toISOString());
  const todayIndex = scheduleDays.findIndex(
    (day) => moscowDateKey(addDays(monday, day).toISOString()) === todayKey,
  );

  if (todayIndex === -1) {
    return scheduleDays;
  }

  return scheduleDays.slice(todayIndex);
}
