import { cn } from "@/lib/ui/cn";
import { useEffect, useMemo, useState } from "react";
import type { MeetingDate } from "./types.ts";
import { formatReservationRange } from "./utils/room-booking-utils.ts";
import { formatSlotKeyLabel, parseSlotKey } from "./utils/slots.ts";

function groupSlotKeysByDate(slotKeys: string[]) {
  const slotsByDate = new Map<string, string[]>();

  for (const slotKey of slotKeys) {
    const { dateId } = parseSlotKey(slotKey);
    const dateSlots = slotsByDate.get(dateId) ?? [];
    dateSlots.push(slotKey);
    slotsByDate.set(
      dateId,
      dateSlots.sort((leftSlotKey, rightSlotKey) => {
        const leftTime = parseSlotKey(leftSlotKey).time;
        const rightTime = parseSlotKey(rightSlotKey).time;

        return leftTime.localeCompare(rightTime);
      }),
    );
  }

  return slotsByDate;
}

export function BookingTimePicker({
  slotKeys,
  formattedDates,
  selectedSlotKeys,
  bookingSlotKey,
  onToggleSlotKey,
}: {
  slotKeys: string[];
  formattedDates: MeetingDate[];
  selectedSlotKeys: ReadonlySet<string>;
  bookingSlotKey: string | null;
  onToggleSlotKey: (slotKey: string) => void;
}) {
  const slotsByDate = useMemo(() => groupSlotKeysByDate(slotKeys), [slotKeys]);

  const datesWithSlots = useMemo(
    () => formattedDates.filter((date) => slotsByDate.has(date.id)),
    [formattedDates, slotsByDate],
  );

  const [activeDateId, setActiveDateId] = useState<string | null>(
    datesWithSlots[0]?.id ?? null,
  );

  useEffect(() => {
    if (bookingSlotKey) {
      setActiveDateId(parseSlotKey(bookingSlotKey).dateId);
      return;
    }

    setActiveDateId((currentDateId) => {
      if (
        currentDateId &&
        datesWithSlots.some((date) => date.id === currentDateId)
      ) {
        return currentDateId;
      }

      return datesWithSlots[0]?.id ?? null;
    });
  }, [bookingSlotKey, datesWithSlots]);

  const activeDateSlots = activeDateId
    ? (slotsByDate.get(activeDateId) ?? [])
    : [];

  return (
    <div className="grid gap-3">
      <div className="flex gap-2 overflow-x-auto pb-0.5">
        {datesWithSlots.map((date) => {
          const isActive = activeDateId === date.id;
          const slotCount = slotsByDate.get(date.id)?.length ?? 0;
          const selectedOnDate = (slotsByDate.get(date.id) ?? []).filter(
            (slotKey) => selectedSlotKeys.has(slotKey),
          ).length;

          return (
            <button
              key={date.id}
              type="button"
              className={cn(
                "rounded-box flex h-auto min-w-[4.5rem] shrink-0 flex-col items-center gap-0.5 border px-2.5 py-1.5 text-base transition-colors",
                isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-base-300 bg-base-100 hover:border-base-content/20",
                selectedOnDate > 0 && !isActive && "border-primary/40",
              )}
              onClick={() => setActiveDateId(date.id)}
            >
              <span className="text-base-content/60">{date.weekDay}</span>
              <span className="font-semibold">{date.monthDay}</span>
              <span className="text-base-content/50 text-base">
                {selectedOnDate > 0
                  ? `${selectedOnDate}/${slotCount} picked`
                  : `${slotCount} slot${slotCount === 1 ? "" : "s"}`}
              </span>
            </button>
          );
        })}
      </div>

      {activeDateSlots.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {activeDateSlots.map((slotKey) => {
            const { time } = parseSlotKey(slotKey);
            const isSelected = selectedSlotKeys.has(slotKey);
            const isBookingTime = bookingSlotKey === slotKey;

            return (
              <button
                key={slotKey}
                type="button"
                title={formatReservationRange(slotKey)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-base tabular-nums transition-colors",
                  isSelected
                    ? "border-primary bg-primary/15 text-primary font-medium"
                    : "border-base-300 hover:border-base-content/25",
                  isSelected &&
                    isBookingTime &&
                    selectedSlotKeys.size > 1 &&
                    "ring-primary ring-1",
                )}
                onClick={() => onToggleSlotKey(slotKey)}
              >
                {time}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-base-content/50 text-base">No times for this day.</p>
      )}

      {selectedSlotKeys.size > 0 && (
        <p className="text-base-content/60 text-base">
          {selectedSlotKeys.size} selected
          {selectedSlotKeys.size > 1 && bookingSlotKey
            ? ` · booking ${formatSlotKeyLabel(bookingSlotKey, formattedDates)}`
            : bookingSlotKey
              ? ` · ${formatReservationRange(bookingSlotKey)}`
              : ""}
        </p>
      )}
    </div>
  );
}
