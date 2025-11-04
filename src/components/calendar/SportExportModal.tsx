import { $events } from "@/api/events";
import { Calendar } from "@/components/calendar/Calendar.tsx";
import ScheduleLinkCopy from "@/components/schedule/ScheduleLinkCopy.tsx";
import { getMySportLink, getPersonalLink } from "@/lib/events/links.ts";
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
import { useEffect, useRef } from "react";

export function SportExportModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: eventsUser } = $events.useQuery("get", "/users/me");

  const { context, refs } = useFloating({ open, onOpenChange });

  // Transition effect
  const { isMounted, styles: transitionStyles } = useTransitionStyles(context);

  // Event listeners to change the open state
  const dismiss = useDismiss(context, { outsidePressEvent: "mousedown" });
  // Role props for screen readers
  const role = useRole(context);

  const { getFloatingProps } = useInteractions([dismiss, role]);

  const {
    mutate: generateScheduleKey,
    isPending,
    data: scheduleKey,
  } = $events.useMutation("post", "/users/me/get-schedule-access-key");

  useEffect(() => {
    if (eventsUser === undefined) return;
    if (isPending) return;
    if (scheduleKey !== undefined) return;
    if (!open) return;
    generateScheduleKey({
      params: {
        query: {
          resource_path: `/users/${eventsUser?.id}/sport.ics`,
        },
      },
    });
  });

  const copyButtonRef = useRef(null);

  if (!isMounted) {
    return null;
  }

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
                    Export sport trainings
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
                  You can add your personal sport trainings schedule to your
                  favorite calendar application and it will be updated on
                  changes.
                </div>
                {/* Export steps */}
                <ul className="text-base-content/75 mt-4 list-decimal pl-5">
                  <li>
                    Copy the personal link.
                    {!scheduleKey ? (
                      <div className="flex flex-row gap-2">Loading...</div>
                    ) : (
                      <ScheduleLinkCopy
                        url={getPersonalLink(
                          scheduleKey.access_key.resource_path,
                          scheduleKey.access_key.access_key,
                        )}
                        copyButtonRef={copyButtonRef}
                      />
                    )}
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
                urls={[
                  {
                    url: getMySportLink(),
                    color: "seagreen",
                    sourceLink: "https://sport.innopolis.university",
                    updatedAt: new Date().toISOString(),
                  },
                ]}
                viewId="popup"
              />
            </div>
          </div>
        </FloatingFocusManager>
      </FloatingOverlay>
    </FloatingPortal>
  );
}
