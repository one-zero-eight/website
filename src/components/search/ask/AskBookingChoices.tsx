import type { searchTypes } from "@/api/search";
import { Trans, useLingui } from "@lingui/react/macro";
import { useState } from "react";
import { bookingMinute as minute, moscowDay } from "./ask-booking";
const clock = (value: number) =>
  new Date(value).toLocaleTimeString("en-GB", {
    timeZone: "Europe/Moscow",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
const timestamp = (value: number) =>
  `${moscowDay(value)}T${clock(value)}:00+03:00`;

export function AskBookingChoices({
  offer,
  disabled,
  onBook,
}: {
  offer: searchTypes.SchemaSignupOffer;
  disabled: boolean;
  onBook: (
    offer: searchTypes.SchemaSignupOffer,
    selection: searchTypes.SchemaSignupSelection,
  ) => void;
}) {
  const { i18n, t } = useLingui();
  const music = offer.service === "music";
  const window = offer.music_window;
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(offer.booking_title ?? "");
  const [start, setStart] = useState("");
  const [duration, setDuration] = useState(
    window?.duration_minutes?.toString() ?? "",
  );
  const [error, setError] = useState("");
  const starts: number[] = [];
  if (window) {
    const last = Math.min(
      Date.parse(window.latest_start_at),
      Date.parse(window.ends_at) - Number(duration || 30) * minute,
    );
    for (
      let value = Date.parse(window.starts_at);
      value <= last;
      value += 30 * minute
    ) {
      if (value > Date.now()) starts.push(value);
    }
  }
  const selectedStart = starts.find((value) => clock(value) === start);
  const durations: number[] = [];
  if (window) {
    const max = Math.min(
      window.max_duration_minutes,
      (Date.parse(window.ends_at) -
        (selectedStart ?? Date.parse(window.starts_at))) /
        minute,
    );
    for (let value = 30; value <= max; value += 30) {
      if (window.duration_minutes == null || value === window.duration_minutes)
        durations.push(value);
    }
  }
  const selectedEnd =
    selectedStart != null && durations.includes(Number(duration))
      ? selectedStart + Number(duration) * minute
      : null;

  function handleBook() {
    setError("");
    if (music) {
      if (selectedStart == null || selectedEnd == null) {
        setError(t`Choose a start time and duration.`);
        return;
      }
      if (selectedStart <= Date.now()) {
        setStart("");
        setError(t`Choose a future time within the available window.`);
        return;
      }
      onBook(
        {
          ...offer,
          starts_at: timestamp(selectedStart),
          ends_at: timestamp(selectedEnd),
        },
        { time_from: clock(selectedStart), time_to: clock(selectedEnd) },
      );
      return;
    }
    if (!title.trim()) {
      setError(t`Enter a booking subject.`);
      return;
    }
    // Match the API's Unicode character limit without truncating user input.
    if (Array.from(title).length > 100) {
      setError(t`Booking subject must be 100 characters or fewer.`);
      return;
    }
    onBook({ ...offer, booking_title: title }, { booking_title: title });
  }

  if (music && !open)
    return (
      <button
        type="button"
        className="btn btn-outline btn-primary btn-sm min-h-9 px-4"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <Trans>Choose time</Trans>
      </button>
    );

  return (
    <div className="grid w-full min-w-0 gap-3">
      {music ? (
        <div className="grid min-w-0 gap-3 @min-[28rem]/signup:grid-cols-2">
          <label className="grid min-w-0 gap-1 text-xs">
            <Trans>Start time (MSK)</Trans>
            <select
              className="select select-sm w-full min-w-0"
              required
              value={start}
              disabled={disabled}
              onChange={(event) => {
                setStart(event.target.value);
                setError("");
              }}
            >
              <option value="">
                <Trans>Choose start time</Trans>
              </option>
              {starts.map((value) => (
                <option key={value} value={clock(value)}>
                  {clock(value)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid min-w-0 gap-1 text-xs">
            <Trans>Duration</Trans>
            <select
              className="select select-sm w-full min-w-0"
              required
              value={duration}
              disabled={disabled}
              onChange={(event) => {
                setDuration(event.target.value);
                setError("");
              }}
            >
              <option value="">
                <Trans>Choose duration</Trans>
              </option>
              {durations.map((value) => (
                <option key={value} value={value}>{t`${value} min`}</option>
              ))}
            </select>
          </label>
        </div>
      ) : (
        <label className="grid min-w-0 gap-1 text-xs">
          <Trans>Booking subject</Trans>
          <input
            className="input input-sm w-full min-w-0"
            required
            value={title}
            disabled={disabled}
            onChange={(event) => {
              setTitle(event.target.value);
              setError("");
            }}
          />
        </label>
      )}
      {selectedStart != null && selectedEnd != null && (
        <p className="text-sm wrap-anywhere tabular-nums">
          {new Date(selectedStart).toLocaleDateString(i18n.locale, {
            timeZone: "Europe/Moscow",
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
          , {clock(selectedStart)}–{clock(selectedEnd)} · MSK
        </p>
      )}
      {error && <p className="text-error text-xs">{error}</p>}
      <button
        type="button"
        className="btn btn-outline btn-primary btn-sm min-h-9 justify-self-start px-4"
        disabled={disabled}
        onClick={handleBook}
      >
        <Trans>Book</Trans>
      </button>
    </div>
  );
}
