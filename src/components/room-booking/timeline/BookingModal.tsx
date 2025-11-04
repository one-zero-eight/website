import { $roomBooking } from "@/api/room-booking";
import {
  clockTime,
  durationFormatted,
  msBetween,
  T,
} from "@/lib/utils/dates.ts";
import {
  FloatingFocusManager,
  FloatingOverlay,
  FloatingPortal,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
  useTransitionStyles,
} from "@floating-ui/react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Booking, Slot } from "./BookingTimeline.vue";

function bookingWarningForSlot({ room, start, end }: Slot) {
  const diffMs = msBetween(start, end);

  if (diffMs < 0) {
    return "End time should be after start time.";
  }

  if (diffMs > 3 * T.Hour) {
    return "Booking duration should not exceed 3 hours.";
  }

  // TODO: Refactor this check to take timezones into account.
  if (room.restrict_daytime) {
    // Should not cover Monday-Friday 08:00-19:00.
    // Assume that duration is <= 3 hours (checked above).

    if (start.getDay() === 0 || start.getDay() === 6) {
      // Check if booking is on weekend
      return null;
    }

    const startSecondsFromDayStart =
      start.getHours() * 3600 + start.getMinutes() * 60 + start.getSeconds();
    const endSecondsFromDayStart =
      end.getHours() * 3600 +
      end.getMinutes() * 60 +
      end.getSeconds() +
      (end.getDay() === start.getDay() ? 0 : 24 * 3600);

    if (
      startSecondsFromDayStart >= 19 * 3600 &&
      endSecondsFromDayStart <= (24 + 8) * 3600
    ) {
      return null;
    }
    if (startSecondsFromDayStart >= 0 && endSecondsFromDayStart <= 8 * 3600) {
      return null;
    }

    return (
      <>
        {"Lecture rooms are only available at night "}
        <span className="text-nowrap">{"(19:00 – 08:00)"}</span>
        {" or on weekends."}
      </>
    );
  }

  return null;
}

function sanitizeTitle(title: string | undefined): string {
  if (!title) return "";
  const sanitized = title
    .replace("Students Booking Service", "")
    .replace("FW:", "")
    .trim();
  if (sanitized) {
    return sanitized;
  } else {
    return title.trim(); // Do not remove "Students Booking Service" if it's the only content
  }
}

export function BookingModal({
  newSlot,
  detailsBooking,
  open,
  onOpenChange,
}: {
  newSlot?: Slot;
  detailsBooking?: Booking;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { context, refs } = useFloating({ open, onOpenChange });
  // Transition effect
  const { isMounted, styles: transitionStyles } = useTransitionStyles(context);
  // Event listeners to change the open state
  const dismiss = useDismiss(context, { outsidePressEvent: "mousedown" });
  // Role props for screen readers
  const role = useRole(context);
  const { getFloatingProps } = useInteractions([dismiss, role]);

  const queryClient = useQueryClient();

  const { data: rooms } = $roomBooking.useQuery("get", "/rooms/");
  const {
    mutate,
    isPending,
    error: creationError,
    reset,
  } = $roomBooking.useMutation("post", "/bookings/");

  const titleInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");

  useEffect(() => {
    setTitle("");
    reset();
  }, [newSlot, reset]);

  const submitBooking = useCallback(() => {
    if (!newSlot) return;
    if (!title) {
      titleInputRef.current?.focus();
      return;
    }

    mutate(
      {
        params: {
          query: {
            room_id: newSlot.room.id,
            title: title,
            start: newSlot.start.toISOString(),
            end: newSlot.end.toISOString(),
          },
        },
      },
      {
        onSuccess: () => {
          setTitle("");
          reset();
          onOpenChange(false);

          queryClient.invalidateQueries({
            queryKey: $roomBooking.queryOptions("get", "/bookings/my").queryKey,
          });

          // Refetch bookings after some time
          setTimeout(() => {
            queryClient.invalidateQueries({
              // All /bookings/ queries, with any params
              queryKey: ["roomBooking", "get", "/bookings/"],
            });
            queryClient.invalidateQueries({
              // All /room/{id}/bookings queries, with any params
              queryKey: ["roomBooking", "get", "/room/{id}/bookings"],
            });
          }, 3000);
        },
      },
    );
  }, [newSlot, title, mutate, reset, queryClient, onOpenChange]);

  if (!isMounted) {
    return null;
  }

  const room =
    newSlot?.room ?? rooms?.find((room) => room.id === detailsBooking?.room_id);
  const start = newSlot?.start ?? detailsBooking?.startsAt;
  const end = newSlot?.end ?? detailsBooking?.endsAt;

  const BookingLocation = room ? (
    <div className="text-base-content/75 flex flex-row items-center gap-2 text-xl">
      <div className="flex h-fit w-6">
        <span className="icon-[material-symbols--location-on-outline] text-2xl" />
      </div>
      <Link
        to="/room-booking/rooms/$room"
        params={{ room: room?.id }}
        className="flex w-full items-center py-1 wrap-anywhere whitespace-pre-wrap hover:underline"
      >
        {room?.title}
      </Link>
    </div>
  ) : undefined;

  const BookingDate = (
    <div className="text-base-content/75 flex flex-row items-center gap-2 text-xl">
      <div className="flex h-fit w-6">
        <span className="icon-[material-symbols--today-outline] text-2xl" />
      </div>
      <p className="flex w-full items-center py-1 wrap-anywhere whitespace-pre-wrap">
        {`${start?.toLocaleString("en-US", { day: "2-digit", month: "long" })}, ${start?.toLocaleString("en-US", { weekday: "long" })}`}
      </p>
    </div>
  );

  const BookingTime = (
    <div className="text-base-content/75 flex flex-row items-center gap-2 text-xl">
      <div className="flex h-fit w-6">
        <span className="icon-[material-symbols--schedule-outline] text-2xl" />
      </div>
      {start && end && (
        <p className="flex w-full items-center py-1 wrap-anywhere whitespace-pre-wrap">
          {`${clockTime(start)} – ${clockTime(end)} (${durationFormatted(msBetween(start, end))})`}
        </p>
      )}
    </div>
  );

  const warningText = newSlot ? bookingWarningForSlot(newSlot) : null;
  const NewBookingWarning = warningText && (
    <div className="alert alert-warning text-base">
      <span>{warningText}</span>
    </div>
  );

  const errorText =
    newSlot && creationError
      ? `Booking failed: ${creationError.detail?.toString() || creationError.toString() || "unknown error"}.`
      : null;
  const NewBookingError = errorText && (
    <div className="alert alert-error text-base">
      <span>{errorText}</span>
    </div>
  );

  const NewBookingButtons = (
    <div className="flex flex-row gap-2">
      <button
        type="button"
        className="bg-inh-primary hover:bg-inh-primary-hover dark:bg-inh-primary-hover dark:hover:bg-inh-primary rounded-box flex w-full items-center justify-center gap-4 px-4 py-2 text-lg font-medium"
        onClick={() => onOpenChange(false)}
      >
        Cancel
      </button>
      <button
        type="submit"
        className="rounded-box flex w-full items-center justify-center gap-2 border-2 border-purple-400 bg-purple-200 px-4 py-2 text-lg font-medium text-purple-900 hover:bg-purple-300 dark:border-purple-600 dark:bg-purple-900 dark:text-purple-300 dark:hover:bg-purple-950"
        disabled={isPending}
      >
        Confirm
        {isPending && (
          <span className="icon-[mdi--loading] text-base-content animate-spin text-2xl" />
        )}
      </button>
    </div>
  );

  const MyBookingButtons = (
    <div className="flex flex-row gap-2">
      <Link
        to="/room-booking/list"
        className="rounded-box flex w-full items-center justify-center gap-2 border-2 border-purple-400 bg-purple-200 px-4 py-2 text-lg font-medium text-purple-900 hover:bg-purple-300 dark:border-purple-600 dark:bg-purple-900 dark:text-purple-300 dark:hover:bg-purple-950"
      >
        Manage my booking
      </Link>
    </div>
  );

  return (
    <FloatingPortal>
      <FloatingOverlay
        className="@container/modal z-10 grid place-items-center bg-black/75"
        lockScroll
      >
        <FloatingFocusManager
          context={context}
          initialFocus={titleInputRef}
          modal
        >
          <div
            ref={refs.setFloating}
            style={transitionStyles}
            {...getFloatingProps()}
            className="flex h-fit w-full max-w-lg flex-col p-4 outline-hidden"
          >
            <div className="bg-base-200 rounded-box overflow-hidden">
              <div className="flex flex-col p-4 @2xl/modal:p-8">
                {/* Heading and description */}
                <div className="mb-4 flex w-full flex-row">
                  <div className="grow items-center text-3xl font-semibold">
                    {newSlot ? "New booking" : "Booking details"}
                  </div>
                  <button
                    type="button"
                    className="text-base-content/50 hover:bg-inh-primary-hover/50 hover:text-base-content/75 rounded-box -mt-2 -mr-2 flex h-12 w-12 items-center justify-center @lg/export:-mt-6 @lg/export:-mr-6"
                    onClick={() => onOpenChange(false)}
                  >
                    <span className="icon-[material-symbols--close] text-4xl" />
                  </button>
                </div>

                {newSlot ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      submitBooking();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        submitBooking();
                      }
                    }}
                  >
                    <div className="flex flex-col gap-2">
                      <input
                        ref={titleInputRef}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter title..."
                        className="bg-inh-secondary focus:ring-primary w-full grow rounded-xl px-4 py-2 text-xl outline-hidden focus:ring-2"
                      />

                      {BookingLocation}
                      {BookingDate}
                      {BookingTime}

                      {NewBookingWarning}
                      {NewBookingError}

                      {NewBookingButtons}
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="text-base-content/75 flex flex-row gap-2 text-xl">
                      <p className="flex w-full items-center py-1 font-semibold wrap-anywhere whitespace-pre-wrap">
                        {sanitizeTitle(detailsBooking?.title)}
                      </p>
                    </div>

                    {BookingLocation}
                    {BookingDate}
                    {BookingTime}
                    {detailsBooking?.myBookingId && MyBookingButtons}
                  </div>
                )}
              </div>
            </div>
          </div>
        </FloatingFocusManager>
      </FloatingOverlay>
    </FloatingPortal>
  );
}
