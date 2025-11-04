import { $events } from "@/api/events";
import { Calendar } from "@/components/calendar/Calendar.tsx";
import ScheduleLinkCopy from "@/components/schedule/ScheduleLinkCopy.tsx";
import { getICSLink } from "@/lib/events/links.ts";
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
import { useRef } from "react";

export function EventGroupExportModal({
  alias,
  open,
  onOpenChange,
}: {
  alias: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: eventsUser } = $events.useQuery("get", "/users/me");
  const { data: group } = $events.useQuery("get", "/event-groups/by-alias", {
    params: { query: { alias } },
  });

  const { context, refs } = useFloating({ open, onOpenChange });

  // Transition effect
  const { isMounted, styles: transitionStyles } = useTransitionStyles(context);

  // Event listeners to change the open state
  const dismiss = useDismiss(context, { outsidePressEvent: "mousedown" });
  // Role props for screen readers
  const role = useRole(context);

  const { getFloatingProps } = useInteractions([dismiss, role]);

  const copyButtonRef = useRef(null);

  if (!isMounted) {
    return null;
  }

  const calendarURL =
    group !== undefined
      ? getICSLink(group.alias, eventsUser?.id, "url")
      : undefined;

  return (
    <FloatingPortal>
      <FloatingOverlay
        className="@container/export z-10 grid place-items-center bg-black/75"
        lockScroll
      >
        <FloatingFocusManager
          context={context}
          initialFocus={copyButtonRef}
          modal
        >
          <div
            ref={refs.setFloating}
            style={transitionStyles}
            {...getFloatingProps()}
            className="flex h-fit w-full flex-col p-4 @2xl/export:w-3/4 @5xl/export:w-1/2"
          >
            <div className="bg-base-200 rounded-box overflow-hidden">
              <div className="flex flex-col p-4">
                {/* Heading and description */}
                <div className="mb-2 flex w-full flex-row">
                  <div className="grow items-center text-3xl font-semibold">
                    Export to your calendar
                  </div>
                  <button
                    type="button"
                    className="text-base-content/50 hover:bg-inh-primary-hover/50 hover:text-base-content/75 rounded-box -mt-2 -mr-2 flex h-12 w-12 items-center justify-center"
                    onClick={() => onOpenChange(false)}
                  >
                    <span className="icon-[material-symbols--close] text-4xl" />
                  </button>
                </div>
                <div className="text-base-content/75">
                  You can add the schedule to your favorite calendar application
                  and it will be updated on schedule changes.
                </div>
                {/* Export steps */}
                <ul className="text-base-content/75 mt-4 list-decimal pl-5">
                  <li>
                    Copy the link.
                    <ScheduleLinkCopy
                      url={calendarURL || ""}
                      copyButtonRef={copyButtonRef}
                    />
                  </li>
                  <li>
                    Open your calendar settings to add a calendar by URL.
                    <a
                      className="ml-4 flex w-fit flex-row items-center gap-x-2 underline"
                      href="https://calendar.google.com/calendar/u/0/r/settings/addbyurl"
                      target="_blank"
                    >
                      <span className="icon-[material-symbols--link] text-base-content/50" />
                      Google Calendar
                    </a>
                    <a className="ml-4 flex w-fit flex-row items-center gap-x-2">
                      <span className="icon-[material-symbols--help-outline] text-base-content/50" />
                      Other applications: find in settings
                    </a>
                  </li>
                  <li>Paste the link and click Add.</li>
                </ul>
              </div>
              {/* Calendar itself */}
              <Calendar
                urls={
                  calendarURL ? [{ url: calendarURL, eventGroup: group }] : []
                }
                viewId="popup"
              />
            </div>
          </div>
        </FloatingFocusManager>
      </FloatingOverlay>
    </FloatingPortal>
  );
}
