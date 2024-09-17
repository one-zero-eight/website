import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  FloatingPortal,
  offset,
  shift,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
  useTransitionStyles,
} from "@floating-ui/react";
import { EventApi } from "@fullcalendar/core";
import moment from "moment";
import React, { useEffect } from "react";

export type ScheduleDialogProps = {
  event: EventApi;
  isOpen: boolean;
  setIsOpen: (open: boolean, event?: Event) => void;
  eventElement: HTMLElement;
};

export default function CalendarEventPopover({
  event,
  isOpen,
  setIsOpen,
  eventElement,
}: React.PropsWithChildren<ScheduleDialogProps>) {
  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(0),
      flip({ fallbackAxisSideDirection: "end" }),
      shift(),
    ],
    elements: {
      reference: eventElement,
    },
  });
  useEffect(() => {
    refs.setPositionReference(eventElement);
  }, [eventElement, refs]);

  // Transition effect
  const { isMounted, styles: transitionStyles } = useTransitionStyles(context, {
    common: {
      transitionProperty: "all",
    },
    duration: 200,
  });

  // Event listeners to change the open state
  const dismiss = useDismiss(context, {
    outsidePressEvent: "click",
    referencePress: true,
    capture: {
      outsidePress: false,
    },
  });
  // Role props for screen readers
  const role = useRole(context);

  // Merge all the interactions into prop getters
  const { getFloatingProps } = useInteractions([dismiss, role]);

  return (
    <>
      {isMounted && (
        <FloatingPortal>
          <FloatingFocusManager
            context={context}
            modal={false}
            initialFocus={-1}
          >
            <div
              ref={refs.setFloating}
              style={{ ...floatingStyles, ...transitionStyles }}
              {...getFloatingProps()}
              className="z-10 flex max-w-md flex-col gap-2 rounded-2xl bg-primary-main p-4 text-sm text-text-main drop-shadow-md"
            >
              <div className="flex flex-row gap-2">
                <div className="w-6 p-1">
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: event.backgroundColor }}
                  ></div>
                </div>
                <div className="text-bold flex whitespace-pre-wrap text-xl [overflow-wrap:anywhere]">
                  {event.title}
                </div>
              </div>
              <div className="flex flex-row gap-2">
                <div className="w-6">
                  <span className="icon-[material-symbols--today-outline] text-2xl" />
                </div>
                <p className="flex w-full whitespace-pre-wrap py-1 [overflow-wrap:anywhere]">
                  {!event.allDay
                    ? moment(event.startStr).format("dddd, D MMMM; HH:mm—") +
                      moment(event.endStr).format("HH:mm")
                    : moment(event.startStr).format("dddd, D MMMM")}
                </p>
              </div>
              {event.extendedProps.location && (
                <div className="flex flex-row gap-2">
                  <div className="w-6">
                    <span className="icon-[material-symbols--location-on-outline] text-2xl" />
                  </div>
                  <p className="flex w-full whitespace-pre-wrap py-1 [overflow-wrap:anywhere]">
                    {event.extendedProps.location}
                  </p>
                </div>
              )}
              {event.extendedProps.description && (
                <div className="flex flex-row gap-2">
                  <div className="w-6">
                    <span className="icon-[material-symbols--notes] text-2xl" />
                  </div>
                  <p className="flex w-full whitespace-pre-wrap py-1 [overflow-wrap:anywhere]">
                    {event.extendedProps.description}
                  </p>
                </div>
              )}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  );
}
