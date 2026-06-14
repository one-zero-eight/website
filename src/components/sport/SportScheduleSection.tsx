import { $sport } from "@/api/sport";
import type {
  SchemaTrainingInfoPersonalSchema,
  SchemaTrainingInfoSchema,
} from "@/api/sport/types.ts";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/ui/cn";
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
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

type PaidFilter = "all" | "free" | "paid";
type ScheduleView = "listWeek" | "timeGridDay";

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
  const [selectedSportId, setSelectedSportId] = useState<number | null>(null);
  const [paidFilter, setPaidFilter] = useState<PaidFilter>("all");
  const [view, setView] = useState<ScheduleView>("listWeek");
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

  const {
    data: sports,
    isPending: sportsPending,
    isError: sportsError,
  } = $sport.useQuery("get", "/sports", {}, { enabled });

  useEffect(() => {
    if (selectedSportId != null || !sports?.length) {
      return;
    }

    setSelectedSportId(sports.find((sport) => sport.groups.length)?.id ?? null);
  }, [selectedSportId, sports]);

  const selectedSport = sports?.find((sport) => sport.id === selectedSportId);
  const selectedDayIndex = useMemo(() => getTodayIndexInWeek(monday), [monday]);

  const {
    data: schedule,
    isPending,
    isError,
  } = $sport.useQuery(
    "get",
    "/sports/{sport_id}/schedule",
    {
      params: {
        path: { sport_id: Number(selectedSportId) },
        query: {
          start: toScheduleApiDateTime(monday),
          end: toScheduleApiDateTime(sundayEnd),
        },
      },
    },
    { enabled: enabled && selectedSportId != null },
  );

  const { data: personalSchedule } = $sport.useQuery(
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
    return (schedule ?? [])
      .filter((training) => {
        if (paidFilter === "free") {
          return !training.is_paid;
        }
        if (paidFilter === "paid") {
          return training.is_paid;
        }
        return true;
      })
      .toSorted(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
      );
  }, [paidFilter, schedule]);

  const groupColorMap = useMemo(() => {
    const map = new Map<string, string>();
    let colorIndex = 0;

    for (const training of schedule ?? []) {
      const key = getTrainingColorKey(training);
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
  }, [schedule]);

  const byDay = useMemo(() => {
    const map = new Map<string, SchemaTrainingInfoSchema[]>();

    for (const training of filteredSchedule) {
      const key = moscowDateKey(training.start);
      map.set(key, [...(map.get(key) ?? []), training]);
    }

    return map;
  }, [filteredSchedule]);

  const rangeLabel = formatSportWeekRangeLabel(monday, sundayEnd);
  const visibleDayIndexes =
    view === "timeGridDay" ? [selectedDayIndex] : scheduleDays;

  function shiftWeek(delta: number) {
    setWeekAnchor((d) => {
      const weekStart = startOfSportWeekMoscow(d);
      return new Date(weekStart.getTime() + delta * 7 * 24 * 3600 * 1000);
    });
  }

  function handleCheckin(training: SchemaTrainingInfoSchema, checkin: boolean) {
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

            <div className="join shrink-0">
              {(["all", "free", "paid"] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={cn(
                    "btn btn-outline btn-primary btn-sm join-item px-3 font-normal",
                    paidFilter === filter && "btn-active",
                  )}
                  onClick={() => setPaidFilter(filter)}
                >
                  {filter === "all"
                    ? "All"
                    : filter === "free"
                      ? "Free"
                      : "Paid"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-[1fr_auto] items-start gap-3 @md/content:grid-cols-[1fr_auto_1fr]">
            <div className="join">
              <button
                type="button"
                className={cn(
                  "btn btn-outline btn-primary btn-sm join-item",
                  view === "listWeek" && "btn-active",
                )}
                onClick={() => setView("listWeek")}
              >
                list
              </button>
              <button
                type="button"
                className={cn(
                  "btn btn-outline btn-primary btn-sm join-item",
                  view === "timeGridDay" && "btn-active",
                )}
                onClick={() => setView("timeGridDay")}
              >
                day
              </button>
            </div>

            <div className="col-span-2 flex min-w-0 flex-wrap items-center justify-end gap-2 @md/content:col-span-1 @md/content:col-start-3">
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
          </div>

          <h3 className="text-center text-3xl leading-tight font-medium">
            {rangeLabel}
          </h3>

          {sportsPending || isPending ? (
            <div className="skeleton h-96 w-full" />
          ) : sportsError || isError ? (
            <div className="alert alert-error">
              Schedule could not be loaded.
            </div>
          ) : !selectedSport ? (
            <div className="text-base-content/70 rounded-box border-base-300 border p-4">
              Choose a sport to view schedule.
            </div>
          ) : filteredSchedule.length === 0 ? (
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
              onSelect={(training) =>
                setSelected(
                  toPersonalTraining(
                    training,
                    checkedTrainingIds.has(training.id),
                    isTrainingCheckInAllowed(
                      training,
                      checkedTrainingIds.has(training.id),
                    ),
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
  byDay: Map<string, SchemaTrainingInfoSchema[]>;
  monday: Date;
  visibleDayIndexes: readonly number[];
  groupColorMap: Map<string, string>;
  checkedTrainingIds: Set<number>;
  pendingTrainingId: number | null;
  onSelect: (training: SchemaTrainingInfoSchema) => void;
  onCheckin: (training: SchemaTrainingInfoSchema, checkin: boolean) => void;
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
            <div className="border-base-300 bg-base-200 flex min-h-11 items-center justify-between gap-3 border-b px-4 py-2">
              <span className="text-base font-bold">{header.weekday}</span>
              <span className="text-base font-bold">
                {formatOriginalDate(date)}
              </span>
            </div>

            {rows.length ? (
              <ul>
                {rows.map((training) => {
                  const checkedIn = checkedTrainingIds.has(training.id);
                  const availablePlaces = getAvailablePlaces(training);
                  const canCheckIn = isTrainingCheckInAllowed(
                    training,
                    checkedIn,
                  );
                  const isPending = pendingTrainingId === training.id;

                  return (
                    <li key={training.id}>
                      <div
                        className="grid min-h-12 w-full grid-cols-[9.5rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-white/30 px-4 py-2 text-left text-base font-bold text-white @max-md/content:grid-cols-[8.5rem_minmax(0,1fr)] @max-sm/content:grid-cols-1 @max-sm/content:gap-2"
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
                          className="text-left tabular-nums"
                          onClick={() => onSelect(training)}
                        >
                          {formatTimeRangeMoscow(training.start, training.end)}
                        </button>
                        <button
                          type="button"
                          className="min-w-0 text-left wrap-break-word"
                          onClick={() => onSelect(training)}
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
                                : "bg-white/90 text-black hover:bg-white",
                            )}
                            disabled={isPending || (!checkedIn && !canCheckIn)}
                            onClick={() => onCheckin(training, !checkedIn)}
                          >
                            {isPending ? (
                              <span className="loading loading-spinner loading-sm" />
                            ) : checkedIn ? (
                              "Check out"
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

function toPersonalTraining(
  training: SchemaTrainingInfoSchema,
  checkedIn: boolean,
  canCheckIn: boolean,
): SchemaTrainingInfoPersonalSchema {
  return {
    training,
    checked_in: checkedIn,
    can_check_in: canCheckIn,
    can_grade: false,
    can_edit: false,
  };
}

function getTrainingColorKey(training: SchemaTrainingInfoSchema): string {
  return String(training.group_id || training.display_name || training.id);
}

function getGeneratedColor(index: number): string {
  const hue = (index * 137) % 360;
  return `hsl(${hue} 62% 42%)`;
}

function getTrainingColor(
  training: SchemaTrainingInfoSchema,
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

function getAvailablePlaces(training: SchemaTrainingInfoSchema): number {
  const places = training.max_checkins - training.checkins_count;
  return Math.max(0, places);
}

function isTrainingCheckInAllowed(
  training: SchemaTrainingInfoSchema,
  checkedIn: boolean,
): boolean {
  if (checkedIn) {
    return true;
  }

  return (
    getAvailablePlaces(training) > 0 && new Date(training.start) > new Date()
  );
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

function getTodayIndexInWeek(monday: Date): number {
  const today = moscowDateKey(new Date().toISOString());
  const index = scheduleDays.findIndex(
    (day) => moscowDateKey(addDays(monday, day).toISOString()) === today,
  );

  return index === -1 ? 0 : index;
}
