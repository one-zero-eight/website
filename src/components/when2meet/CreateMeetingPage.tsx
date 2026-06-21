import { FormEvent, useCallback, useState } from "react";
import { $when2meet } from "@/api/when2meet";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/ui/cn";
import { Link, useNavigate } from "@tanstack/react-router";
import { Calendar } from "./CreationModal/Calendar.tsx";
import { TimeRange } from "./CreationModal/TimeRange.tsx";
import { buildSlotsFromDatesAndRange } from "./utils/api-slots.ts";
import { parseHour, TimeRangeSelection } from "./utils/dates.ts";
import { trackCreatedEvent } from "./utils/local-events.ts";
import { markPendingSetup } from "./utils/setup-slots.ts";

type TimeMode = "range" | "manual";

function isTimeRangeValid(timeRange: TimeRangeSelection) {
  return parseHour(timeRange.end) > parseHour(timeRange.start);
}

export function CreateMeetingPage() {
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  const [meetingName, setMeetingName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [timeRange, setTimeRange] = useState<TimeRangeSelection>({
    start: "09:00",
    end: "17:00",
  });
  const [timeMode, setTimeMode] = useState<TimeMode>("range");
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
      timeMode === "range" && !isTimeRangeValid(timeRange)
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

    createEvent(
      {
        body: {
          name: trimmedName,
          description: description.trim() || undefined,
          slots,
        },
      },
      {
        onSuccess: (createdEvent) => {
          if (!createdEvent.id) {
            showError("Error", "Meeting was created without an id.");
            return;
          }

          if (timeMode === "manual") {
            markPendingSetup(createdEvent.id);
          }

          trackCreatedEvent({
            id: createdEvent.id,
            name: trimmedName,
            description: description.trim() || createdEvent.description,
          });

          showSuccess(
            "Meeting created",
            timeMode === "manual"
              ? "Choose allowed timeslots on the next screen."
              : `"${trimmedName}" is ready to share.`,
          );
          navigate({
            to: "/when2meet/$meetingId",
            params: { meetingId: createdEvent.id },
            search: {
              name: trimmedName,
              setupSlots: timeMode === "manual" ? true : undefined,
            },
          });
        },
      },
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-4">
      <Link
        to="/when2meet"
        className="text-base-content/70 hover:text-base-content mb-4 inline-flex items-center gap-1 text-sm"
      >
        <span className="icon-[material-symbols--arrow-back]" />
        All meetings
      </Link>

      <h1 className="mb-1 text-xl font-semibold">New meeting</h1>
      <p className="text-base-content/70 mb-6 text-sm">
        Pick dates and times, then share the link so everyone can mark when they
        are free.
      </p>

      <form onSubmit={handleSubmit} className="grid gap-6">
        <section className="bg-base-100 border-base-300 rounded-box border p-4">
          <label className="block">
            <span className="text-sm font-medium">
              Meeting name<span className="text-error ml-0.5">*</span>
            </span>
            <input
              type="text"
              className={cn(
                "input input-bordered mt-1.5 w-full",
                nameError && "input-error",
              )}
              placeholder="Team sync"
              value={meetingName}
              onChange={(event) => {
                setMeetingName(event.target.value);
                setNameError(undefined);
              }}
            />
            {nameError && (
              <p className="text-error mt-1 text-sm">{nameError}</p>
            )}
          </label>

          <label className="mt-4 block">
            <span className="text-sm font-medium">Description</span>
            <textarea
              className="textarea textarea-bordered mt-1.5 w-full resize-none"
              placeholder="Optional details"
              rows={2}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
        </section>

        <section className="bg-base-100 border-base-300 rounded-box border p-4">
          <h2 className="mb-3 text-sm font-medium">Dates</h2>
          <Calendar onDatesChange={handleDatesChange} />
          {datesError && (
            <p className="text-error mt-2 text-sm">{datesError}</p>
          )}
        </section>

        <section className="bg-base-100 border-base-300 rounded-box border p-4">
          <h2 className="mb-3 text-sm font-medium">Times</h2>

          <div className="mb-4 grid gap-2">
            <label
              className={cn(
                "border-base-300 flex cursor-pointer items-start gap-3 rounded-lg border p-3",
                timeMode === "range" && "border-primary bg-primary/5",
              )}
            >
              <input
                type="radio"
                name="timeMode"
                className="radio radio-primary mt-0.5"
                checked={timeMode === "range"}
                onChange={() => {
                  setTimeMode("range");
                  setTimeError(undefined);
                }}
              />
              <span>
                <span className="text-sm font-medium">Time range</span>
                <span className="text-base-content/60 mt-0.5 block text-sm">
                  Same hours every selected day, e.g. 9:00–17:00
                </span>
              </span>
            </label>

            <label
              className={cn(
                "border-base-300 flex cursor-pointer items-start gap-3 rounded-lg border p-3",
                timeMode === "manual" && "border-primary bg-primary/5",
              )}
            >
              <input
                type="radio"
                name="timeMode"
                className="radio radio-primary mt-0.5"
                checked={timeMode === "manual"}
                onChange={() => {
                  setTimeMode("manual");
                  setTimeError(undefined);
                }}
              />
              <span>
                <span className="text-sm font-medium">
                  Pick slots for each day
                </span>
                <span className="text-base-content/60 mt-0.5 block text-sm">
                  You will be asked to fill time slots on next step
                </span>
              </span>
            </label>
          </div>

          {timeMode === "range" && (
            <>
              <TimeRange
                defaultTimeValue={timeRange}
                setValueCallback={(value) => {
                  setTimeRange(value);
                  setTimeError(undefined);
                }}
              />
              {timeError && (
                <p className="text-error mt-2 text-sm">{timeError}</p>
              )}
            </>
          )}
        </section>

        <section className="bg-base-100 border-base-300 rounded-box flex gap-2 border p-4">
          <Link to="/when2meet" className="btn btn-ghost min-w-0 flex-1">
            Cancel
          </Link>
          <button
            type="submit"
            className="btn btn-primary min-w-0 flex-1"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="loading loading-spinner" />
            ) : (
              "Create"
            )}
          </button>
        </section>
      </form>
    </div>
  );
}
