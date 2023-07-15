"use client";
import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  FloatingPortal,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
  useTransitionStyles,
} from "@floating-ui/react";
import { EventApi } from "@fullcalendar/core";
import moment from "moment";
import React from "react";

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

  // Transition effect
  const { isMounted, styles: transitionStyles } = useTransitionStyles(context, {
    common: {
      transitionProperty: "all",
      transitionDuration: "150ms",
    },
  });

  // Event listeners to change the open state
  const click = useClick(context, { toggle: false });
  const dismiss = useDismiss(context, { outsidePressEvent: "click" });
  // Role props for screen readers
  const role = useRole(context);

  // Merge all the interactions into prop getters
  const { getFloatingProps } = useInteractions([click, dismiss, role]);

  return (
    <>
      {isMounted && (
        <FloatingPortal id="calendarPopover">
          <FloatingFocusManager
            context={context}
            modal={false}
            // order={["reference", "content"]}
            initialFocus={-1}
          >
            <div
              ref={refs.setFloating}
              style={{ ...floatingStyles, ...transitionStyles }}
              {...getFloatingProps()}
              className="z-10 bg-primary-main text-text-main text-sm p-4 rounded-md drop-shadow-md max-w-md"
            >
              <div className="text-xl text-bold">{event.title}</div>
              <div>
                {moment(event.startStr).format("dddd, D MMMM, HH:mm")}&ndash;
                {moment(event.endStr).format("HH:mm")}
              </div>
              <div>{event.extendedProps.location}</div>
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  );
}
