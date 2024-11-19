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
import { Link } from "@tanstack/react-router";
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

  let locations: string[] | undefined = undefined;
  if (event.extendedProps?.location)
    locations = event.extendedProps?.location.split("/");

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
              className="z-10 flex max-w-md flex-col gap-2 rounded-2xl bg-primary p-4 text-sm text-contrast drop-shadow-md"
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
              {locations && (
                <div className="flex flex-row gap-2">
                  <div className="w-6">
                    <span className="icon-[material-symbols--location-on-outline] text-2xl" />
                  </div>
                  <div className="flex flex-row gap-1">
                    {locations.map((location: string, index: number) =>
                      location.toUpperCase() !== "ONLINE" &&
                      location.toUpperCase() !== "ОНЛАЙН" ? (
                        <div className="flex flex-row items-center gap-1">
                          <Link
                            key={index}
                            to="/maps"
                            search={{
                              q: location,
                            }}
                            target="_blank"
                            className="flex w-full whitespace-pre-wrap py-1 underline underline-offset-2 [overflow-wrap:anywhere]"
                          >
                            {location}
                          </Link>
                          {index !== locations.length - 1 && (
                            <p className="py-1">/</p>
                          )}
                        </div>
                      ) : (
                        <p className="flex w-full whitespace-pre-wrap py-1">
                          {location.concat(
                            index !== locations.length - 1 ? " / " : "",
                          )}
                        </p>
                      ),
                    )}
                  </div>
                </div>
              )}
              {event.extendedProps?.description && (
                <div className="flex flex-row gap-2">
                  <div className="w-6">
                    <span className="icon-[material-symbols--notes] text-2xl" />
                  </div>
                  <p className="flex w-full whitespace-pre-wrap py-1 [overflow-wrap:anywhere]">
                    {event.extendedProps.description}
                  </p>
                </div>
              )}
              {event.extendedProps?.updatedAt && (
                <div className="flex flex-row gap-2">
                  <div className="w-6">
                    <span className="icon-[material-symbols--update] text-2xl" />
                  </div>
                  <p className="flex w-full whitespace-pre-wrap py-1 [overflow-wrap:anywhere]">
                    Calendar updated at:{" "}
                    {moment(event.extendedProps.updatedAt).format("DD.MM HH:m")}
                  </p>
                </div>
              )}
              {event.extendedProps?.sourceLink && (
                <div className="flex flex-row gap-2">
                  <div className="w-6">
                    <span className="icon-[material-symbols--link] text-2xl" />
                  </div>
                  <a
                    href={event.extendedProps.sourceLink}
                    target="_blank"
                    className="flex w-full whitespace-pre-wrap py-1 underline underline-offset-2 [overflow-wrap:anywhere]"
                  >
                    Go to source
                  </a>
                </div>
              )}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  );
}
