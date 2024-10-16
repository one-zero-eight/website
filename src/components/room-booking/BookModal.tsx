import { $roomBooking } from "@/api/room-booking";
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
import { useCallback, useEffect, useRef, useState } from "react";
import type { Slot } from "./BookingTimeline.vue";

function durationFormatted(durationMs: number): string {
  const hours = Math.floor(durationMs / (3600 * 1000));
  const minutes = Math.floor((durationMs % (3600 * 1000)) / (60 * 1000));
  return `${hours > 0 ? `${hours}h ` : ""}${minutes > 0 ? `${minutes}m` : ""}`.trim();
}

function checkBookingErrors({ room, start, end }: Slot): string | null {
  if (end.getTime() < start.getTime()) {
    return "End time should be after start time";
  }

  if (end.getTime() - start.getTime() > 3 * 3600 * 1000) {
    return "Booking duration should not exceed 3 hours";
  }

  if (room.restrict_daytime) {
    // Should not cover Monday-Friday 8:00-19:00.
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

    return "Lecture rooms are available only at night 19:00-8:00, or full day on weekends";
  }
  return null;
}

export function BookModal({
  data,
  open,
  onOpenChange,
}: {
  data?: Slot;
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

  const errorMessage = data ? checkBookingErrors(data) : null;

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
  }, [data, reset]);

  const submitBooking = useCallback(() => {
    if (!data) return;
    if (!title) {
      titleInputRef.current?.focus();
      return;
    }

    mutate(
      {
        params: {
          query: {
            room_id: data.room.id,
            title: title,
            start: data.start.toISOString(),
            end: data.end.toISOString(),
          },
        },
      },
      {
        onSuccess: () => {
          setTitle("");
          reset();
          // Refresh window to update caches in Vue
          window.location.reload();
          onOpenChange(false);
        },
      },
    );
  }, [data, title, mutate, onOpenChange, reset]);

  if (!isMounted) {
    return null;
  }

  return (
    <FloatingPortal>
      <FloatingOverlay
        className="z-10 grid place-items-center bg-black/75 @container/modal"
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
            className="flex h-fit w-full max-w-lg flex-col p-4"
          >
            <div className="overflow-hidden rounded-2xl bg-popup">
              <div className="flex flex-col p-4 @2xl/modal:p-8">
                {/* Heading and description */}
                <div className="mb-2 flex w-full flex-row">
                  <div className="grow items-center text-3xl font-semibold">
                    New booking
                  </div>
                  <button
                    className="-mr-2 -mt-2 h-52 w-52 rounded-2xl p-2 text-icon-main/50 hover:bg-primary-hover/50 hover:text-icon-hover/75 @lg/export:-mr-6 @lg/export:-mt-6"
                    onClick={() => onOpenChange(false)}
                  >
                    <span className="icon-[material-symbols--close] text-4xl" />
                  </button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitBooking();
                  }}
                >
                  <div className="flex flex-col gap-2">
                    <input
                      ref={titleInputRef}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter title"
                      className="w-full grow rounded-xl bg-secondary-main p-2 outline-none focus:ring-2 focus:ring-focus"
                    />

                    <div className="flex flex-row items-center gap-2 text-xl text-text-secondary/75">
                      <div className="flex h-fit w-6">
                        <span className="icon-[material-symbols--location-on-outline] text-2xl" />
                      </div>
                      <p className="flex w-full items-center whitespace-pre-wrap py-1 font-medium [overflow-wrap:anywhere]">
                        {data?.room.title}
                      </p>
                    </div>

                    <div className="flex flex-row items-center gap-2 text-xl text-text-secondary/75">
                      <div className="flex h-fit w-6">
                        <span className="icon-[material-symbols--today-outline] text-2xl" />
                      </div>
                      <p className="flex w-full items-center whitespace-pre-wrap py-1 font-medium [overflow-wrap:anywhere]">
                        {data?.start.toLocaleString("en-US", {
                          day: "2-digit",
                          month: "long",
                        })}
                        ,{" "}
                        {data?.start.toLocaleString("en-US", {
                          weekday: "long",
                        })}
                      </p>
                    </div>

                    <div className="flex flex-row items-center gap-2 text-xl text-text-secondary/75">
                      <div className="flex h-fit w-6">
                        <span className="icon-[material-symbols--schedule-outline] text-2xl" />
                      </div>
                      {data && (
                        <p className="flex w-full items-center whitespace-pre-wrap py-1 font-medium [overflow-wrap:anywhere]">
                          {data.start.toLocaleString("ru-RU", {
                            hour: "2-digit",
                            minute: "2-digit",
                          }) +
                            " - " +
                            data.end.toLocaleString("ru-RU", {
                              hour: "2-digit",
                              minute: "2-digit",
                            }) +
                            " (" +
                            durationFormatted(
                              data.end.getTime() - data.start.getTime(),
                            ) +
                            ")"}
                        </p>
                      )}
                    </div>

                    {errorMessage && (
                      <div className="flex flex-row gap-2 rounded-2xl border-2 border-red-500/50 bg-red-800/50 p-2">
                        {errorMessage}
                      </div>
                    )}

                    {creationError && (
                      <div className="flex flex-row gap-2 rounded-2xl border-2 border-red-500/50 bg-red-800/50 p-2">
                        Cannot book the room:{" "}
                        {creationError.detail?.toString() ??
                          (creationError.toString() || "Unknown error")}
                      </div>
                    )}

                    <div className="flex flex-row gap-2">
                      <button
                        className="flex w-full items-center justify-center gap-4 rounded-2xl bg-primary-main px-4 py-2 text-lg font-medium hover:bg-primary-hover"
                        onClick={() => onOpenChange(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex w-full items-center justify-center gap-4 rounded-2xl border-2 border-focus/50 bg-focus/25 px-4 py-2 text-lg font-medium hover:bg-focus/50"
                        disabled={isPending}
                      >
                        Book
                        {!isPending ? (
                          <span className="icon-[material-symbols--check] text-2xl text-icon-main" />
                        ) : (
                          <span className="icon-[mdi--loading] animate-spin text-2xl text-icon-main" />
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </FloatingFocusManager>
      </FloatingOverlay>
    </FloatingPortal>
  );
}
