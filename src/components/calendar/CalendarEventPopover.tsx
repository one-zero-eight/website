import { $workshops } from "@/api/workshops";
import {
  IcsHostsList,
  PublicHostsList,
} from "@/components/events/shared/HostLink";
import { parseIcsHostDescription } from "@/components/events/utils/host";
import { extractEventIdFromUrl } from "@/components/events/utils/links";
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
import { useEffect } from "react";

export type ScheduleDialogProps = {
  event: EventApi;
  isOpen: boolean;
  setIsOpen: (open: boolean, event?: Event) => void;
  eventElement: HTMLElement;
};

export function CalendarEventPopover({
  event,
  isOpen,
  setIsOpen,
  eventElement,
}: ScheduleDialogProps) {
  const eventId = extractEventIdFromUrl(event.url);
  const icsHosts = parseIcsHostDescription(
    event.extendedProps?.description as string | undefined,
  );
  const isWorkshopsEvent = !!eventId || icsHosts.length > 0;

  const { data: eventData } = $workshops.useQuery(
    "get",
    "/events/{id}",
    { params: { path: { id: eventId ?? "" } } },
    { enabled: !!eventId && isOpen },
  );

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

  const { isMounted, styles: transitionStyles } = useTransitionStyles(context, {
    common: {
      transitionProperty: "all",
    },
    duration: 50,
  });

  const dismiss = useDismiss(context, {
    outsidePressEvent: "click",
    referencePress: true,
    capture: {
      outsidePress: false,
    },
  });
  const role = useRole(context);
  const { getFloatingProps } = useInteractions([dismiss, role]);

  const location =
    eventData?.data.location ??
    (event.extendedProps?.location as string | undefined);
  const locations =
    !isWorkshopsEvent && location ? location.split("/") : undefined;
  const hosts = eventData?.data.hosts;
  const showHosts = (hosts && hosts.length > 0) || icsHosts.length > 0;
  const showRawDescription =
    !!event.extendedProps?.description && !isWorkshopsEvent;

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
              className="bg-base-200 text-base-content rounded-box z-10 flex max-w-md flex-col gap-2 p-4 text-sm drop-shadow-md"
            >
              <div className="flex flex-row gap-2">
                <div className="w-6 p-1">
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: event.backgroundColor }}
                  />
                </div>
                <div className="text-bold flex text-xl wrap-anywhere whitespace-pre-wrap">
                  {event.title}
                </div>
              </div>
              <div className="flex flex-row gap-2">
                <div className="w-6">
                  <span className="icon-[material-symbols--today-outline] text-2xl" />
                </div>
                <p className="flex w-full py-1 wrap-anywhere whitespace-pre-wrap">
                  {!event.allDay
                    ? moment(event.startStr).format("dddd, D MMMM; HH:mm—") +
                      moment(event.endStr).format("HH:mm")
                    : moment(event.startStr).format("dddd, D MMMM")}
                </p>
              </div>

              {isWorkshopsEvent && location && (
                <div className="flex flex-row gap-2">
                  <div className="w-6">
                    <span className="icon-[material-symbols--location-on-outline] text-2xl" />
                  </div>
                  {location.toUpperCase() === "ONLINE" ||
                  location.toUpperCase() === "ОНЛАЙН" ||
                  location.toUpperCase() === "TBA" ? (
                    <span className="flex w-full py-1 whitespace-pre-wrap">
                      {location}
                    </span>
                  ) : (
                    <Link
                      to="/maps"
                      search={{ q: location }}
                      className="flex w-full py-1 wrap-anywhere whitespace-pre-wrap underline underline-offset-2"
                    >
                      {location}
                    </Link>
                  )}
                </div>
              )}

              {locations && (
                <div className="flex flex-row gap-2">
                  <div className="w-6">
                    <span className="icon-[material-symbols--location-on-outline] text-2xl" />
                  </div>
                  <div className="flex flex-row flex-wrap gap-1">
                    {locations.map((item: string, index: number) =>
                      item.toUpperCase() !== "ONLINE" &&
                      item.toUpperCase() !== "ОНЛАЙН" ? (
                        <div
                          key={index}
                          className="flex flex-row items-center gap-1"
                        >
                          <Link
                            to="/maps"
                            search={{
                              q: item,
                            }}
                            target="_blank"
                            className="flex w-full py-1 wrap-anywhere whitespace-pre-wrap underline underline-offset-2"
                          >
                            {item}
                          </Link>
                          {index !== locations.length - 1 && (
                            <span className="py-1">/</span>
                          )}
                        </div>
                      ) : (
                        <span
                          key={index}
                          className="flex w-full py-1 whitespace-pre-wrap"
                        >
                          {item.concat(
                            index !== locations.length - 1 ? " / " : "",
                          )}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              )}

              {showHosts && (
                <div className="flex flex-row gap-2">
                  <div className="w-6">
                    <span className="icon-[material-symbols--person-outline] text-2xl" />
                  </div>
                  <div className="flex w-full py-1 wrap-anywhere">
                    {hosts && hosts.length > 0 ? (
                      <PublicHostsList hosts={hosts} />
                    ) : (
                      <IcsHostsList hosts={icsHosts} />
                    )}
                  </div>
                </div>
              )}

              {showRawDescription && (
                <div className="flex flex-row gap-2">
                  <div className="w-6">
                    <span className="icon-[material-symbols--notes] text-2xl" />
                  </div>
                  <p className="flex w-full py-1 wrap-anywhere whitespace-pre-wrap">
                    {event.extendedProps.description}
                  </p>
                </div>
              )}

              {eventId && (
                <div className="flex flex-row gap-2">
                  <div className="w-6">
                    <span className="icon-[material-symbols--link] text-2xl" />
                  </div>
                  <Link
                    to="/events/p/$id"
                    params={{ id: eventId }}
                    className="flex w-full py-1 underline underline-offset-2"
                    onClick={() => setIsOpen(false)}
                  >
                    Open event page
                  </Link>
                </div>
              )}

              {event.extendedProps?.updatedAt && (
                <div className="flex flex-row gap-2">
                  <div className="w-6">
                    <span className="icon-[material-symbols--update] text-2xl" />
                  </div>
                  <p className="flex w-full py-1 wrap-anywhere whitespace-pre-wrap">
                    Calendar updated at:{" "}
                    {moment(event.extendedProps.updatedAt).format(
                      "DD.MM HH:mm",
                    )}
                  </p>
                </div>
              )}
              {event.extendedProps?.sourceLink && !eventId && (
                <div className="flex flex-row gap-2">
                  <div className="w-6">
                    <span className="icon-[material-symbols--link] text-2xl" />
                  </div>
                  <a
                    href={event.extendedProps.sourceLink}
                    target="_blank"
                    className="flex w-full py-1 wrap-anywhere whitespace-pre-wrap underline underline-offset-2"
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

export default CalendarEventPopover;
