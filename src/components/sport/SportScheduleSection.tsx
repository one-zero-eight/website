import { $sport } from "@/api/sport";
import type { SchemaTrainingInfoPersonalSchema } from "@/api/sport/types.ts";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/ui/cn";
import { SportStudentTrainingModal } from "@/components/sport/SportStudentTrainingModal.tsx";
import { SportTrainerTrainingModal } from "@/components/sport/SportTrainerTrainingModal.tsx";
import {
  formatDayHeaderMoscow,
  formatTimeRangeMoscow,
  getSchedulePeriodBounds,
  moscowDateKey,
  toScheduleApiDateTime,
} from "@/components/sport/sport-week-utils.ts";
import { sportTrainingTitle } from "@/components/sport/sport-training-label.ts";
import {
  canShowCheckInButton,
  isCheckInUnavailable,
  isTrainerTraining,
} from "@/components/sport/sport-checkin-utils.ts";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type CSSProperties } from "react";

const scheduleTrainingColors = {
  trainer: "#EF7B20",
  studentUnavailable: "#C73D40",
  studentCheckedIn: "#42932A",
  studentCanCheckIn: "#306EFD",
} as const;

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
  trainerGroupIds,
}: {
  enabled: boolean;
  studentId: number;
  trainerGroupIds: ReadonlySet<number>;
}) {
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useToast();
  const [periodOffset, setPeriodOffset] = useState(0);
  const [pendingTrainingId, setPendingTrainingId] = useState<number | null>(
    null,
  );
  const [checkinOverrides, setCheckinOverrides] = useState<
    Record<number, boolean>
  >({});
  const [selected, setSelected] =
    useState<SchemaTrainingInfoPersonalSchema | null>(null);

  const { start: periodStart, end: periodEnd } = useMemo(
    () => getSchedulePeriodBounds(periodOffset),
    [periodOffset],
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
          start: toScheduleApiDateTime(periodStart),
          end: toScheduleApiDateTime(periodEnd),
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

  const byDay = useMemo(() => {
    const map = new Map<string, SchemaTrainingInfoPersonalSchema[]>();

    for (const row of filteredSchedule) {
      const key = moscowDateKey(row.training.start);
      map.set(key, [...(map.get(key) ?? []), row]);
    }

    return map;
  }, [filteredSchedule]);
  const visibleTrainingCount = useMemo(() => {
    return scheduleDays.reduce((count: number, dayIndex) => {
      const key = moscowDateKey(addDays(periodStart, dayIndex).toISOString());
      return count + (byDay.get(key)?.length ?? 0);
    }, 0);
  }, [byDay, periodStart]);

  function shiftPeriod(delta: number) {
    setPeriodOffset((offset) => offset + delta);
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

  function handleTrainingModalOpenChange(open: boolean) {
    if (!open) setSelected(null);
  }

  function renderSelectedTrainingModal() {
    if (!selected) {
      return null;
    }

    if (isTrainerTraining(selected, trainerGroupIds)) {
      return (
        <SportTrainerTrainingModal
          open
          onOpenChange={handleTrainingModalOpenChange}
          row={selected}
        />
      );
    }

    return (
      <SportStudentTrainingModal
        open
        onOpenChange={handleTrainingModalOpenChange}
        row={selected}
        studentId={studentId}
        trainerGroupIds={trainerGroupIds}
      />
    );
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
              onClick={() => setPeriodOffset(0)}
            >
              today
            </button>
            <div className="join">
              <button
                type="button"
                className="btn btn-outline btn-primary btn-sm join-item"
                onClick={() => shiftPeriod(-1)}
              >
                <span className="icon-[material-symbols--chevron-left] text-lg" />
              </button>
              <button
                type="button"
                className="btn btn-outline btn-primary btn-sm join-item"
                onClick={() => shiftPeriod(1)}
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
              periodStart={periodStart}
              trainerGroupIds={trainerGroupIds}
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

      {renderSelectedTrainingModal()}
    </>
  );
}

function SportScheduleList({
  byDay,
  periodStart,
  trainerGroupIds,
  checkedTrainingIds,
  pendingTrainingId,
  onSelect,
  onCheckin,
}: {
  byDay: Map<string, SchemaTrainingInfoPersonalSchema[]>;
  periodStart: Date;
  trainerGroupIds: ReadonlySet<number>;
  checkedTrainingIds: Set<number>;
  pendingTrainingId: number | null;
  onSelect: (row: SchemaTrainingInfoPersonalSchema) => void;
  onCheckin: (
    training: SchemaTrainingInfoPersonalSchema["training"],
    checkin: boolean,
  ) => void;
}) {
  return (
    <div className="border-base-300 overflow-hidden border dark:border-white">
      {scheduleDays.map((index) => {
        const date = addDays(periodStart, index);
        const key = moscowDateKey(date.toISOString());
        const rows = byDay.get(key) ?? [];
        const header = formatDayHeaderMoscow(date.toISOString());

        return (
          <section key={key}>
            <div className="border-base-300 bg-base-200 flex min-h-9 items-center justify-between gap-3 border-b px-3 py-1.5 dark:border-white">
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
                  const canCheckIn = canShowCheckInButton(
                    row,
                    checkedIn,
                    trainerGroupIds,
                  );
                  const isPending = pendingTrainingId === training.id;
                  const trainingColor = getTrainingColor(
                    row,
                    checkedIn,
                    trainerGroupIds,
                  );

                  return (
                    <li key={training.id}>
                      <div
                        className={cn(
                          "group grid min-h-10 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b px-3 py-1 text-left text-base font-bold",
                          "border-white/30 text-white transition-colors hover:!bg-[#8D4CF6]",
                          "dark:border-white dark:!bg-black dark:text-[color:var(--training-accent)] dark:hover:!bg-[#181419] dark:hover:!text-[#8D4CF6]",
                        )}
                        style={
                          {
                            "--training-accent": trainingColor,
                            backgroundColor: trainingColor,
                          } as CSSProperties
                        }
                      >
                        <button
                          type="button"
                          className="flex min-h-8 shrink-0 items-center text-left tabular-nums"
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
                        {canCheckIn ? (
                          <button
                            type="button"
                            className={cn(
                              "btn btn-xs min-w-24 shrink-0 border-2 transition-colors",
                              checkedIn
                                ? cn(
                                    "border-white bg-[#42932A] text-white group-hover:border-white group-hover:bg-[#8D4CF6] group-hover:text-white hover:border-white hover:bg-[#8D4CF6] hover:text-white",
                                    "dark:!border-[#C73D40] dark:!bg-[#100F11] dark:!text-[#C73D40] dark:group-hover:!border-[#8D4CF6] dark:group-hover:!bg-[#181419] dark:group-hover:!text-[#8D4CF6] dark:hover:!border-[#8D4CF6] dark:hover:!bg-[#181419] dark:hover:!text-[#8D4CF6]",
                                  )
                                : cn(
                                    "border-white bg-[#306EFD] text-white group-hover:border-white group-hover:bg-[#8D4CF6] group-hover:text-white hover:border-white hover:bg-[#8D4CF6] hover:text-white",
                                    "dark:!border-[#306EFD] dark:!bg-[#100F11] dark:!text-[#306EFD] dark:group-hover:!border-[#8D4CF6] dark:group-hover:!bg-[#181419] dark:group-hover:!text-[#8D4CF6] dark:hover:!border-[#8D4CF6] dark:hover:!bg-[#181419] dark:hover:!text-[#8D4CF6]",
                                  ),
                            )}
                            disabled={isPending}
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
                        ) : null}
                        {/*
                        <span className="text-sm whitespace-nowrap">
                          {training.max_checkins - training.checkins_count}/
                          {training.max_checkins}
                        </span>
                        */}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="text-base-content/50 border-base-300 border-b px-3 py-3 text-sm dark:border-white">
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

function getTrainingColor(
  row: SchemaTrainingInfoPersonalSchema,
  checkedIn: boolean,
  trainerGroupIds: ReadonlySet<number>,
): string {
  if (isTrainerTraining(row, trainerGroupIds)) {
    return scheduleTrainingColors.trainer;
  }

  if (checkedIn) {
    return scheduleTrainingColors.studentCheckedIn;
  }

  if (isCheckInUnavailable(row, checkedIn)) {
    return scheduleTrainingColors.studentUnavailable;
  }

  return scheduleTrainingColors.studentCanCheckIn;
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
