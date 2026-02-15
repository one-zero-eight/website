import { $events } from "@/api/events";
import { Calendar } from "@/components/calendar/Calendar.tsx";
import ScheduleLinkCopy from "@/components/schedule/ScheduleLinkCopy.tsx";
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
import { getICSLink, getPersonalLink } from "@/api/events/links.ts";
import { TargetForExport } from "@/api/events/types.ts";

export function ExportModal({
  eventGroupOrTarget,
  open,
  onOpenChange,
  aboveModal = false,
}: {
  eventGroupOrTarget: number | TargetForExport | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aboveModal?: boolean;
}) {
  const isEventGroupModal = typeof eventGroupOrTarget === "number";
  const isTargetModal = !!(
    eventGroupOrTarget &&
    typeof eventGroupOrTarget !== "number" &&
    Object.values(TargetForExport).includes(eventGroupOrTarget)
  );
  const { data: eventsUser } = $events.useQuery("get", "/users/me");
  const { data: eventGroup } = $events.useQuery(
    "get",
    "/event-groups/{event_group_id}",
    {
      params: { path: { event_group_id: Number(eventGroupOrTarget) } },
    },
    {
      enabled: isEventGroupModal,
    },
  );

  const { data: scheduleKey } = $events.useQuery(
    "post",
    "/users/me/get-schedule-access-key",
    {
      params: {
        query: {
          resource_path: `/users/${eventsUser?.id}/${eventGroupOrTarget}.ics`,
        },
      },
    },
    {
      enabled: isTargetModal,
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    },
  );

  const { context, refs } = useFloating({ open, onOpenChange });

  // Transition effect
  const { isMounted, styles: transitionStyles } = useTransitionStyles(context);

  // Event listeners to change the open state
  const dismiss = useDismiss(context, { outsidePressEvent: "mousedown" });
  // Role props for screen readers
  const role = useRole(context);

  const { getFloatingProps } = useInteractions([dismiss, role]);

  const copyButtonRef = useRef(null);

  if (!isMounted || !eventsUser) {
    return null;
  }

  let calendarURL = "";
  if (isEventGroupModal && eventGroup) {
    calendarURL = getICSLink(eventGroup.alias, eventsUser?.id, "url");
  }

  if (isTargetModal && scheduleKey) {
    calendarURL = getPersonalLink(
      scheduleKey.access_key.resource_path,
      scheduleKey.access_key.access_key,
    );
  }

  return (
    <FloatingPortal>
      <FloatingOverlay
        className={`@container/export z-10 grid place-items-center ${aboveModal ? "bg-black/50" : "bg-black/75"}`}
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
            className="flex h-fit w-full max-w-[100vw] flex-col p-4 @2xl/export:w-3/4 @5xl/export:w-2/3"
          >
            <div className="bg-base-200 rounded-box overflow-hidden">
              <div className="flex flex-col p-4">
                {/* Heading and description */}
                <div className="mb-2 flex w-full flex-row">
                  <div className="grow items-center text-3xl font-semibold">
                    {isTargetModal
                      ? modalText[eventGroupOrTarget].title
                      : "Export to your calendar"}
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
                  {isTargetModal
                    ? modalText[eventGroupOrTarget].description
                    : "You can add the schedule to your favorite calendar application\n" +
                      "                  and it will be updated on schedule changes."}
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
                  calendarURL
                    ? [{ url: calendarURL, eventGroup: eventGroup }]
                    : []
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

const modalText: Record<
  TargetForExport,
  { title: string; description: string }
> = {
  [TargetForExport.music_room]: {
    title: "Export music room bookings",
    description:
      "You can add your personal music room schedule to your favorite\n" +
      "                  calendar application and it will be updated on changes.",
  },
  [TargetForExport.sport]: {
    title: "Export sport trainings",
    description:
      "You can add your personal sport trainings schedule to your\n" +
      "                  favorite calendar application and it will be updated on\n" +
      "                  changes.",
  },
  [TargetForExport.moodle]: {
    title: "Export Moodle deadlines",
    description:
      "You can add deadlines from your Moodle courses to your favorite calendar application and it will be updated on changes.",
  },
  [TargetForExport.room_bookings]: {
    title: "Export room bookings",
    description:
      "You can add your room bookings to your favorite\n" +
      "                  calendar application and it will be updated on changes.",
  },
  [TargetForExport.workshops]: {
    title: "Export to your calendar",
    description:
      "You can add the schedule to your favorite calendar application\n" +
      "                  and it will be updated on schedule changes.",
  },
};
