import { FormEvent, useCallback, useMemo, useState } from "react";
import { Modal } from "@/components/common/Modal.tsx";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/ui/cn";
import { useNavigate } from "@tanstack/react-router";
import { Calendar } from "./Calendar.tsx";
import { TimeRange } from "./TimeRange.tsx";
import { TimeRangeSelection } from "../utils/dates.ts";

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

export function CreationDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { showInfo } = useToast();
  const navigate = useNavigate();
  const [meetingName, setMeetingName] = useState("");
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [timeRange, setTimeRange] = useState<TimeRangeSelection>({
    start: "09:00",
    end: "17:00",
  });
  const [useSpecificTime, setUseSpecificTime] = useState(false);
  const [selectedTimezone, setSelectedTimezone] = useState(getInitialTimezone);
  const [nameError, setNameError] = useState<string>();
  const [datesError, setDatesError] = useState<string>();

  const timezones = useMemo(() => {
    if (TIMEZONES.includes(selectedTimezone)) {
      return TIMEZONES;
    }

    return [selectedTimezone, ...TIMEZONES];
  }, [selectedTimezone]);

  function resetForm() {
    setMeetingName("");
    setSelectedDates(new Set());
    setTimeRange({ start: "09:00", end: "17:00" });
    setUseSpecificTime(false);
    setNameError(undefined);
    setDatesError(undefined);
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

    setNameError(nextNameError);
    setDatesError(nextDatesError);

    if (nextNameError || nextDatesError) {
      return;
    }

    showInfo(
      "Meeting draft ready",
      "Backend is not connected yet, so nothing was saved.",
    );
    handleOpenChange(false);
    navigate({
      to: "/when-to-meet/$meetingId",
      params: { meetingId: `mock-${Date.now().toString(36)}` },
      search: { name: trimmedName },
    });
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
              className="py-4 lg:pr-4"
            />
            {datesError && (
              <p className="text-error pb-4 text-sm font-medium lg:hidden">
                {datesError}
              </p>
            )}

            <div className="border-base-300 flex flex-col-reverse justify-between py-4 lg:mb-0 lg:flex-col lg:border-l lg:pl-4">
              <div>
                <label className="block">
                  <span className="text-base-content text-sm font-bold">
                    Meeting name<span className="text-error ml-1">*</span>
                  </span>
                  <input
                    type="text"
                    className={cn(
                      "input border-base-300 bg-base-100 text-base-content placeholder:text-base-content/40 focus:border-primary mt-1 mb-1 w-full rounded-lg focus:outline-none",
                      nameError && "input-error border-error",
                    )}
                    placeholder="Name your meeting"
                    value={meetingName}
                    onChange={(event) => {
                      setMeetingName(event.target.value);
                      setNameError(undefined);
                    }}
                  />
                </label>
                {nameError && (
                  <p className="text-error mb-3 text-sm font-medium">
                    {nameError}
                  </p>
                )}
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
                      onChange={(event) =>
                        setUseSpecificTime(event.target.checked)
                      }
                    />
                    <span className="text-sm font-semibold">Specific Time</span>
                  </label>
                </div>

                <TimeRange
                  className="mt-4"
                  defaultTimeValue={timeRange}
                  disabled={useSpecificTime}
                  setValueCallback={setTimeRange}
                />
              </div>
            </div>
          </div>
        </div>

        <footer className="border-base-300 relative z-20 flex items-center justify-between border-t p-4">
          <div className="text-base-content/60 flex min-w-0 items-center gap-2">
            <span className="icon-[material-symbols--globe] aspect-square text-2xl" />
            <div className="flex min-w-0 flex-col text-xs">
              <span className="text-base-content font-semibold">Time zone</span>
              <select
                className="select select-ghost select-xs text-base-content/60 relative z-30 h-5 min-h-5 max-w-36 px-0 text-xs focus:z-50 focus:outline-none"
                value={selectedTimezone}
                onChange={(event) => setSelectedTimezone(event.target.value)}
              >
                {timezones.map((timezone) => (
                  <option key={timezone} value={timezone}>
                    {timezone}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-outline btn-sm border-base-300 text-base-content/80 hover:bg-base-200 hover:border-base-300 hover:text-base-content"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              {useSpecificTime ? "Next" : "Create"}
            </button>
          </div>
        </footer>
      </form>
    </Modal>
  );
}
