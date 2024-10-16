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
import type { Booking } from "./BookingTimeline.vue";

function durationFormatted(durationMs: number): string {
  const hours = Math.floor(durationMs / (3600 * 1000));
  const minutes = Math.floor((durationMs % (3600 * 1000)) / (60 * 1000));
  return `${hours > 0 ? `${hours}h ` : ""}${minutes > 0 ? `${minutes}m` : ""}`.trim();
}

function sanitizeTitle(title: string | undefined): string {
  if (!title) return "";
  return title.replace("Students Booking Service", "").trim();
}

export function ViewBookingModal({
  data,
  open,
  onOpenChange,
}: {
  data?: Booking;
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

  const { data: rooms } = $roomBooking.useQuery("get", "/rooms/");

  const room = rooms?.find((room) => room.id === data?.room_id);

  if (!isMounted) {
    return null;
  }

  return (
    <FloatingPortal>
      <FloatingOverlay
        className="z-10 grid place-items-center bg-black/75 @container/modal"
        lockScroll
      >
        <FloatingFocusManager context={context} modal>
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
                    Booking details
                  </div>
                  <button
                    className="-mr-2 -mt-2 h-52 w-52 rounded-2xl p-2 text-icon-main/50 hover:bg-primary-hover/50 hover:text-icon-hover/75 @lg/export:-mr-6 @lg/export:-mt-6"
                    onClick={() => onOpenChange(false)}
                  >
                    <span className="icon-[material-symbols--close] text-4xl" />
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex flex-row gap-2 text-xl text-text-secondary/75">
                    <div className="mt-1.5 flex h-fit w-6">
                      <span className="icon-[material-symbols--notes] text-2xl" />
                    </div>
                    <p className="flex w-full items-center whitespace-pre-wrap py-1 font-medium [overflow-wrap:anywhere]">
                      {sanitizeTitle(data?.title)}
                    </p>
                  </div>

                  <div className="flex flex-row items-center gap-2 text-xl text-text-secondary/75">
                    <div className="flex h-fit w-6">
                      <span className="icon-[material-symbols--location-on-outline] text-2xl" />
                    </div>
                    <p className="flex w-full items-center whitespace-pre-wrap py-1 font-medium [overflow-wrap:anywhere]">
                      {room?.title}
                    </p>
                  </div>

                  <div className="flex flex-row items-center gap-2 text-xl text-text-secondary/75">
                    <div className="flex h-fit w-6">
                      <span className="icon-[material-symbols--today-outline] text-2xl" />
                    </div>
                    <p className="flex w-full items-center whitespace-pre-wrap py-1 font-medium [overflow-wrap:anywhere]">
                      {data?.startsAt.toLocaleString("en-US", {
                        day: "2-digit",
                        month: "long",
                      })}
                      ,{" "}
                      {data?.startsAt.toLocaleString("en-US", {
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
                        {data.startsAt.toLocaleString("ru-RU", {
                          hour: "2-digit",
                          minute: "2-digit",
                        }) +
                          " - " +
                          data.endsAt.toLocaleString("ru-RU", {
                            hour: "2-digit",
                            minute: "2-digit",
                          }) +
                          " (" +
                          durationFormatted(
                            data.endsAt.getTime() - data.startsAt.getTime(),
                          ) +
                          ")"}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FloatingFocusManager>
      </FloatingOverlay>
    </FloatingPortal>
  );
}
