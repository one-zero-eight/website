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
import { useCallback, useRef, useState } from "react";
import type { NewBooking } from "./BookingTimeline.vue";

function getBookingUrl(booking: {
  myUniRoomId: number;
  title: string;
  start: Date;
  end: Date;
}) {
  // Need to add Moscow offset.
  const fmtDate = (d: Date) =>
    new Date(d.getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0, 16);

  const url = new URL(import.meta.env.VITE_BOOKING_MY_UNI_URL);
  url.searchParams.set("room", booking.myUniRoomId.toString());
  url.searchParams.set("title", booking.title);
  url.searchParams.set("start", fmtDate(booking.start));
  url.searchParams.set("end", fmtDate(booking.end));
  return url.toString();
}

export function BookModal({
  data,
  open,
  onOpenChange,
}: {
  data?: NewBooking;
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

  const titleInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");

  const submitBooking = useCallback(() => {
    if (!data) return;
    if (!title) {
      titleInputRef.current?.focus();
      return;
    }

    window.open(
      getBookingUrl({
        myUniRoomId: data.room.my_uni_id,
        title: title,
        start: data.from,
        end: data.to,
      }),
    );
    setTitle("");
    onOpenChange(false);
  }, [title, data, onOpenChange]);

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
                    Create new booking
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
                    <div className="text-xl text-text-secondary/75">
                      Room: <b>{data?.room.title}</b>
                    </div>
                    <div className="text-xl text-text-secondary/75">
                      Time:{" "}
                      <b>
                        {data?.from.toLocaleString("ru-RU", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        }) +
                          " - " +
                          data?.to.toLocaleString("ru-RU", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                      </b>
                    </div>

                    <div className="flex flex-row items-center gap-4">
                      <div className="text-xl text-text-secondary/75">
                        Title:
                      </div>
                      <input
                        ref={titleInputRef}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full grow rounded-xl bg-secondary-main p-2 outline-none focus:ring-2 focus:ring-focus"
                      />
                    </div>

                    <div className="flex flex-row justify-end">
                      <button
                        type="submit"
                        className="flex w-fit items-center justify-center gap-4 rounded-2xl border-2 border-focus bg-base px-4 py-2 text-lg font-medium hover:bg-primary-hover"
                      >
                        Book
                        <span className="icon-[material-symbols--check] text-2xl text-icon-main" />
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
