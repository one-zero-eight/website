import { Calendar } from "@/components/calendar/Calendar.tsx";
import ScheduleLinkCopy from "@/components/schedule/ScheduleLinkCopy.tsx";
import { events, getICSLink } from "@/lib/events";
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
  const { data: eventsUser } = events.useUsersGetMe();
  const { data: group } = events.useEventGroupsFindEventGroupByAlias({ alias });

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
        className="z-10 grid place-items-center bg-black/75 @container/export"
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
            <div className="overflow-hidden rounded-2xl bg-popup">
              <div className="flex flex-col p-4 @2xl/export:p-8">
                {/* Heading and description */}
                <div className="mb-2 flex w-full flex-row">
                  <div className="grow items-center text-3xl font-semibold">
                    Export to your calendar
                  </div>
                  <button
                    className="-mr-2 -mt-2 h-52 w-52 rounded-2xl p-2 text-icon-main/50 hover:bg-primary-hover/50 hover:text-icon-hover/75 @lg/export:-mr-6 @lg/export:-mt-6"
                    onClick={() => onOpenChange(false)}
                  >
                    <span className="icon-[material-symbols--close] text-4xl" />
                  </button>
                </div>
                <div className="text-text-secondary/75">
                  You can add the schedule to your favorite calendar application
                  and it will be updated on schedule changes.
                </div>
                {/* Export steps */}
                <ul className="my-4 list-decimal pl-5 text-text-secondary/75">
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
                      <span className="icon-[material-symbols--link] text-icon-main/50" />
                      Google Calendar
                    </a>
                    <a className="ml-4 flex w-fit flex-row items-center gap-x-2">
                      <span className="icon-[material-symbols--help-outline] text-icon-main/50" />
                      Other applications: find in settings
                    </a>
                  </li>
                  <li>Paste the link and click Add.</li>
                </ul>
                {/* Calendar itself */}
                <div className="-mx-4 -mb-4 @2xl/export:-mx-8 @2xl/export:-mb-8">
                  <Calendar
                    urls={
                      calendarURL
                        ? [{ url: calendarURL, eventGroup: group }]
                        : []
                    }
                    viewId="popup"
                  />
                </div>
              </div>
            </div>
          </div>
        </FloatingFocusManager>
      </FloatingOverlay>
    </FloatingPortal>
  );
}