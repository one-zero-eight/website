import { FormEvent, useCallback, useState, type ReactNode } from "react";
import { $when2meet } from "@/api/when2meet";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/ui/cn";
import { Link, useNavigate } from "@tanstack/react-router";
import { buildSlotsFromDatesAndRange } from "./utils/api-slots.ts";
import { markPendingSetup } from "./utils/setup-slots.ts";
import { Calendar } from "./CreationModal/Calendar.tsx";
import { TimeRange } from "./CreationModal/TimeRange.tsx";
import { parseHour, TimeRangeSelection } from "./utils/dates.ts";

type TimeSetupMode = "daily_range" | "manual_slots";

function isTimeRangeValid(timeRange: TimeRangeSelection) {
  return parseHour(timeRange.end) > parseHour(timeRange.start);
}

function TimeSetupOption({
  selected,
  title,
  name,
  onSelect,
  children,
}: {
  selected: boolean;
  title: string;
  name: string;
  onSelect: () => void;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "card card-border",
        selected && "border-primary bg-primary/5",
      )}
    >
      <div className="card-body gap-0 p-4">
        <label className="label cursor-pointer justify-start gap-3 p-0">
          <input
            type="radio"
            name={name}
            className="radio radio-primary"
            checked={selected}
            onChange={onSelect}
          />
          <span className="text-base-content label-text">{title}</span>
        </label>
        {selected && children && <div className="mt-3 pl-9">{children}</div>}
      </div>
    </div>
  );
}

export function CreationPage() {
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  const [meetingName, setMeetingName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [timeRange, setTimeRange] = useState<TimeRangeSelection>({
    start: "09:00",
    end: "17:00",
  });
  const [timeSetupMode, setTimeSetupMode] =
    useState<TimeSetupMode>("daily_range");
  const [nameError, setNameError] = useState<string>();
  const [datesError, setDatesError] = useState<string>();
  const [timeError, setTimeError] = useState<string>();

  const { mutate: createEvent, isPending: isSubmitting } =
    $when2meet.useMutation("post", "/events/", {
      onError: (error) => {
        showError("Error", formatApiErrorMessage(error));
      },
    });

  const handleDatesChange = useCallback((calendar: Set<string>) => {
    setSelectedDates(new Set(calendar));

    if (calendar.size > 0) {
      setDatesError(undefined);
    }
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = meetingName.trim();
    const nextNameError =
      trimmedName.length < 3
        ? "Meeting name should contain at least 3 symbols."
        : undefined;
    const nextDatesError =
      selectedDates.size === 0 ? "Choose at least one date." : undefined;
    const nextTimeError =
      timeSetupMode === "daily_range" && !isTimeRangeValid(timeRange)
        ? "End time must be later than start time."
        : undefined;

    setNameError(nextNameError);
    setDatesError(nextDatesError);
    setTimeError(nextTimeError);

    if (nextNameError || nextDatesError || nextTimeError) {
      return;
    }

    const slots = buildSlotsFromDatesAndRange(
      selectedDates,
      timeRange.start,
      timeRange.end,
    );

    const isManualSlots = timeSetupMode === "manual_slots";

    createEvent(
      {
        body: {
          name: trimmedName,
          description: description.trim() || undefined,
          slots,
          timezone: "Europe/Moscow",
          specific_time: isManualSlots,
          time_range:
            timeSetupMode === "daily_range"
              ? { start: timeRange.start, end: timeRange.end }
              : undefined,
        },
      },
      {
        onSuccess: (createdEvent) => {
          if (!createdEvent.id) {
            showError("Error", "Meeting was created without an id.");
            return;
          }

          if (isManualSlots) {
            markPendingSetup(createdEvent.slug);
          }

          showSuccess(
            "Meeting created",
            isManualSlots
              ? "Choose allowed timeslots on the meeting page."
              : `"${trimmedName}" is ready for participants.`,
          );
          navigate({
            to: "/when2meet/$meetingId",
            params: { meetingId: createdEvent.slug },
            search: {
              setupSlots: isManualSlots ? true : undefined,
            },
          });
        },
      },
    );
  }

  return (
    <div className="mx-auto mb-20 w-full max-w-[900px] px-4 py-4 md:mb-4">
      <Link
        to="/when2meet"
        className="text-base-content/70 hover:text-base-content mb-4 inline-flex w-fit items-center gap-1 text-sm font-medium"
      >
        <span className="icon-[material-symbols--arrow-back] text-lg" />
        All meetings
      </Link>

      <h1 className="mb-6 text-2xl font-semibold">New meeting</h1>

      <form
        onSubmit={handleSubmit}
        className="bg-base-100 border-base-300 rounded-box"
      >
        <div className="grid grid-cols-2 lg:flex-row">
          <Calendar
            onDatesChange={handleDatesChange}
            className="w-full lg:pr-6"
          />
          {datesError && (
            <p className="text-error pb-4 text-sm font-medium lg:hidden">
              {datesError}
            </p>
          )}

          <div className="border-base-300 flex flex-col-reverse justify-between lg:mb-0 lg:flex-col lg:border-l lg:pl-6">
            <div>
              <label className="block min-w-0 flex-1">
                <span className="text-sm">
                  Meeting name<span className="text-error ml-1">*</span>
                </span>
                <input
                  type="text"
                  className={cn(
                    "input input-bordered mt-1 w-full focus:outline-none",
                    nameError && "input-error border-error",
                  )}
                  placeholder="Name your meeting"
                  value={meetingName}
                  onChange={(event) => {
                    setMeetingName(event.target.value);
                    setNameError(undefined);
                  }}
                />
                {nameError && (
                  <p className="text-error mt-1 text-sm font-medium">
                    {nameError}
                  </p>
                )}
              </label>
              <label className="mt-3 block min-w-0">
                <span className="text-sm">Description</span>
                <textarea
                  className="textarea textarea-bordered mt-1 h-full w-full resize-none focus:outline-none"
                  placeholder="Optional meeting details"
                  rows={3}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </label>
              {datesError && (
                <p className="text-error my-3 hidden text-sm font-medium lg:block">
                  {datesError}
                </p>
              )}

              <label className="fieldset mt-3">
                <span className="text-sm">When can people meet?</span>
                <div className="grid gap-2">
                  <TimeSetupOption
                    name="time-setup-mode"
                    selected={timeSetupMode === "daily_range"}
                    title="Same hours every day"
                    onSelect={() => {
                      setTimeSetupMode("daily_range");
                      setTimeError(undefined);
                    }}
                  >
                    <TimeRange
                      defaultTimeValue={timeRange}
                      setValueCallback={(value) => {
                        setTimeRange(value);
                        setTimeError(undefined);
                      }}
                    />
                    {timeError && (
                      <p className="text-error mt-2 text-sm font-medium">
                        {timeError}
                      </p>
                    )}
                  </TimeSetupOption>

                  <TimeSetupOption
                    name="time-setup-mode"
                    selected={timeSetupMode === "manual_slots"}
                    title="Pick timeslots on the next step"
                    onSelect={() => {
                      setTimeSetupMode("manual_slots");
                      setTimeError(undefined);
                    }}
                  />
                </div>
              </label>
            </div>
            <footer className="flex justify-end gap-2 pt-4">
              <Link to="/when2meet" className="btn btn-ghost">
                Cancel
              </Link>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  "Create"
                )}
              </button>
            </footer>
          </div>
        </div>
      </form>
    </div>
  );
}
