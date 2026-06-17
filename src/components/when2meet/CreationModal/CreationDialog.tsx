import { FormEvent, useCallback, useMemo, useState } from "react";
import { $when2meet } from "@/api/when2meet";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { Modal } from "@/components/common/Modal.tsx";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/ui/cn";
import { useNavigate } from "@tanstack/react-router";
import { buildSlotsFromDatesAndRange } from "../utils/api-slots.ts";
import { trackCreatedEvent } from "../utils/local-events.ts";
import { markPendingSetup } from "../utils/setup-slots.ts";
import { Calendar } from "./Calendar.tsx";
import { TimeRange } from "./TimeRange.tsx";
import { parseHour, TimeRangeSelection } from "../utils/dates.ts";

const TIMEZONES = [
  "Europe/Moscow",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Yekaterinburg",
  "Asia/Tokyo",
  "America/New_York",
  "America/Los_Angeles",
];

function getInitialTimezone() {
  if (!Intl.DateTimeFormat().resolvedOptions().timeZone) {
    return "Europe/Moscow";
  }

  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function isTimeRangeValid(timeRange: TimeRangeSelection) {
  return parseHour(timeRange.end) > parseHour(timeRange.start);
}

export function CreationDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}) {
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  const [meetingName, setMeetingName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [timeRange, setTimeRange] = useState<TimeRangeSelection>({
    start: "09:00",
    end: "17:00",
  });
  const [useSpecificTime, setUseSpecificTime] = useState(false);
  const [selectedTimezone, setSelectedTimezone] = useState(getInitialTimezone);
  const [nameError, setNameError] = useState<string>();
  const [datesError, setDatesError] = useState<string>();
  const [timeError, setTimeError] = useState<string>();

  const { mutate: createEvent, isPending: isSubmitting } =
    $when2meet.useMutation("post", "/events/", {
      onError: (error) => {
        showError("Error", formatApiErrorMessage(error));
      },
    });

  const timezones = useMemo(() => {
    if (TIMEZONES.includes(selectedTimezone)) {
      return TIMEZONES;
    }

    return [selectedTimezone, ...TIMEZONES];
  }, [selectedTimezone]);

  function resetForm() {
    setMeetingName("");
    setDescription("");
    setSelectedDates(new Set());
    setTimeRange({ start: "09:00", end: "17:00" });
    setUseSpecificTime(false);
    setSelectedTimezone(getInitialTimezone());
    setNameError(undefined);
    setDatesError(undefined);
    setTimeError(undefined);
  }

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);

    if (!nextOpen) {
      resetForm();
    }
  }

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
      !useSpecificTime && !isTimeRangeValid(timeRange)
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

          if (useSpecificTime) {
            markPendingSetup(createdEvent.id);
          }

          trackCreatedEvent({
            id: createdEvent.id,
            name: trimmedName,
            description: description.trim() || createdEvent.description,
          });
          onCreated?.();

          showSuccess(
            "Meeting created",
            useSpecificTime
              ? "Choose allowed timeslots on the meeting page."
              : `"${trimmedName}" is ready for participants.`,
          );
          handleOpenChange(false);
          navigate({
            to: "/when2meet/$meetingId",
            params: { meetingId: createdEvent.id },
            search: {
              name: trimmedName,
              setupSlots: useSpecificTime ? true : undefined,
            },
          });
        },
      },
    );
  }

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      hideHeader
      overlayClassName="flex items-end justify-center bg-black/20 p-0 md:items-center md:p-4"
      containerClassName="bg-base-100 text-base-content mx-auto max-h-[calc(100dvh-20px)] w-full max-w-sm gap-0 overflow-hidden rounded-t-2xl border-0 p-0 shadow-2xl md:max-h-[90vh] md:rounded-2xl lg:w-[700px] lg:max-w-[calc(100vw-2rem)]"
    >
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
        <header className="border-base-300 text-base-content/50 flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-1">
            <span className="text-base-content font-mono text-sm font-bold">
              NEW MEETING
            </span>
            <span
              className="icon-[material-symbols--info-outline] text-base-content/30 mb-0.5 text-lg"
              title="Start by adding a title for your meeting. Next, pick the dates and times that work for you."
            />
          </div>
          <button
            type="button"
            className="text-base-content/70 hover:text-base-content/85 flex cursor-pointer items-center justify-center"
            onClick={() => handleOpenChange(false)}
          >
            <span className="icon-[material-symbols--close] text-2xl" />
          </button>
        </header>

        <div className="max-h-[500px] overflow-auto lg:overflow-visible">
          <div className="flex flex-col-reverse justify-between px-4 lg:flex-row">
            <Calendar
              onDatesChange={handleDatesChange}
              className="w-full py-4 lg:pr-4"
            />
            {datesError && (
              <p className="text-error pb-4 text-sm font-medium lg:hidden">
                {datesError}
              </p>
            )}

            <div className="border-base-300 flex flex-col-reverse justify-between py-4 lg:mb-0 lg:flex-col lg:border-l lg:pl-4">
              <div>
                <label className="block min-w-0 flex-1">
                  <span className="text-base-content text-sm font-bold">
                    Meeting name<span className="text-error ml-1">*</span>
                  </span>
                  <input
                    type="text"
                    className={cn(
                      "input border-base-300 bg-base-100 text-base-content placeholder:text-base-content/40 focus:border-primary mt-1 w-full rounded-lg focus:outline-none",
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
                  <span className="text-base-content text-sm font-bold">
                    Description
                  </span>
                  <textarea
                    className="textarea textarea-bordered mt-1 h-full w-full resize-none focus:outline-none"
                    placeholder="Optional meeting details"
                    rows={3}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </label>
                {datesError && (
                  <p className="text-error mb-3 hidden text-sm font-medium lg:block">
                    {datesError}
                  </p>
                )}

                <div className="mt-3 mb-1 flex justify-between gap-10">
                  <label className="flex flex-row items-center gap-2 lg:mb-0">
                    <input
                      type="checkbox"
                      className="toggle toggle-primary"
                      checked={useSpecificTime}
                      onChange={(event) => {
                        setUseSpecificTime(event.target.checked);
                        setTimeError(undefined);
                      }}
                    />
                    <span className="text-sm font-semibold">Specific Time</span>
                  </label>
                </div>

                <TimeRange
                  className="mt-4"
                  defaultTimeValue={timeRange}
                  disabled={useSpecificTime}
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
                {useSpecificTime && (
                  <p className="text-base-content/60 mt-2 text-sm">
                    You will choose exact timeslots on the meeting page after
                    creation.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <footer className="border-base-300 flex flex-col gap-3 border-t p-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex min-w-0 items-center gap-2">
              <span className="text-base-content flex items-center gap-1 text-sm font-bold text-nowrap">
                <span className="icon-[material-symbols--globe] text-lg" />
                Time zone
              </span>
              <select
                className="select select-bordered select-sm w-full min-w-0"
                value={selectedTimezone}
                onChange={(event) => setSelectedTimezone(event.target.value)}
              >
                {timezones.map((timezone) => (
                  <option key={timezone} value={timezone}>
                    {timezone}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex shrink-0 justify-end gap-2">
            <button
              type="button"
              className="btn btn-outline btn-sm border-base-300 text-base-content/80 hover:bg-base-200 hover:border-base-300 hover:text-base-content"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                "Create"
              )}
            </button>
          </div>
        </footer>
      </form>
    </Modal>
  );
}
