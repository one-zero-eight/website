"use client";
import { CalendarEventIcon } from "@/components/icons/CalendarEventIcon";
import { LocationIcon } from "@/components/icons/LocationIcon";
import { NotesIcon } from "@/components/icons/NotesIcon";
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
    },
    duration: 200,
  });

  // Event listeners to change the open state
  const dismiss = useDismiss(context, { outsidePressEvent: "click" });
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
              <div className="text-bold flex px-8 text-xl">{event.title}</div>
              <div className="flex flex-row items-center gap-2">
                <CalendarEventIcon
                  width={24}
                  height={24}
                  className="flex fill-icon-main"
                />
                {moment(event.startStr).format("dddd, D MMMM; HH:mm—")}
                {moment(event.endStr).format("HH:mm")}
              </div>
              {event.extendedProps.location && (
                <div className="flex flex-row items-center gap-2">
                  <LocationIcon
                    width={24}
                    height={24}
                    className="flex fill-icon-main"
                  />
                  <p className="flex">{event.extendedProps.location}</p>
                </div>
              )}
              {event.extendedProps.description && (
                <div className="flex flex-row gap-2">
                  <NotesIcon
                    width={24}
                    height={24}
                    className="flex fill-icon-main"
                  />
                  <p className="flex whitespace-pre-wrap [overflow-wrap:anywhere]">
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
