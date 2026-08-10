import { $workshops } from "@/api/workshops";
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
import { extractEventIdFromUrl } from "../utils/links";
import { parseIcsHostDescription } from "../utils/host";
import { IcsHostsList, PublicHostsList } from "../shared/HostLink";

export function EventsCalendarPopover({
  event,
  isOpen,
  setIsOpen,
  eventElement,
}: {
  event: EventApi;
  isOpen: boolean;
  setIsOpen: (open: boolean, event?: Event) => void;
  eventElement: HTMLElement;
}) {
  const eventId = extractEventIdFromUrl(event.url);

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
  const icsHosts = parseIcsHostDescription(
    event.extendedProps?.description as string | undefined,
  );
  const hosts = eventData?.data.hosts;

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
                  {moment(event.startStr).format("dddd, D MMMM; HH:mm")}
                </p>
              </div>

              {location && (
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

              {((hosts && hosts.length > 0) || icsHosts.length > 0) && (
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
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  );
}
