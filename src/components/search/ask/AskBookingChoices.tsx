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
  const availableStarts: number[] = [];
  const now = Date.now();
  if (window) {
    const last = Math.min(
      Date.parse(window.latest_start_at),
      Date.parse(window.ends_at) - (window.duration_minutes ?? 30) * minute,
    );
    for (
      let value = Date.parse(window.starts_at);
      value <= last;
      value += 30 * minute
    ) {
      if (value > now) availableStarts.push(value);
    }
  }
  const starts = availableStarts.filter(
    (value) =>
      value + Number(duration || window?.duration_minutes || 30) * minute <=
      Date.parse(window!.ends_at),
  );
  const selectedStart = starts.find((value) => clock(value) === start);
  const onlyStart =
    availableStarts.length === 1 ? availableStarts[0] : undefined;
  const durations: number[] = [];
  if (window) {
    const max = Math.min(
      window.max_duration_minutes,
      (Date.parse(window.ends_at) -
        (selectedStart ?? onlyStart ?? Date.parse(window.starts_at))) /
        minute,
    );
    for (let value = 30; value <= max; value += 30) {
      if (window.duration_minutes == null || value === window.duration_minutes)
        durations.push(value);
    }
  }
  const singleInterval = onlyStart != null && durations.length === 1;
  const bookingStart = singleInterval ? onlyStart : selectedStart;
  const bookingDuration = singleInterval ? durations[0] : Number(duration);
  const selectedEnd =
    bookingStart != null && durations.includes(bookingDuration)
      ? bookingStart + bookingDuration * minute
      : null;

  function handleBook() {
    if (disabled) return;
    setError("");
    if (music) {
      if (bookingStart == null || selectedEnd == null) {
        setError(t`Choose a start time and duration.`);
        return;
      }
      if (bookingStart <= Date.now()) {
        setOpen(true);
        setStart("");
        setError(t`Choose a future time within the available window.`);
        return;
      }
      onBook(
        {
          ...offer,
          starts_at: timestamp(bookingStart),
          ends_at: timestamp(selectedEnd),
        },
        { time_from: clock(bookingStart), time_to: clock(selectedEnd) },
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

  if (music && !open && !singleInterval)
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
      {music && !singleInterval && (
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
      )}
      {!music && (
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
      {bookingStart != null && selectedEnd != null && (
        <p className="text-sm wrap-anywhere tabular-nums">
          {new Date(bookingStart).toLocaleDateString(i18n.locale, {
            timeZone: "Europe/Moscow",
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
          , {clock(bookingStart)}–{clock(selectedEnd)} · MSK
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
