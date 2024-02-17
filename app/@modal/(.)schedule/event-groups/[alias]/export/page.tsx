"use client";
import Calendar from "@/components/common/calendar/Calendar";
import ScheduleLinkCopy from "@/components/schedule/ScheduleLinkCopy";
import {
  getICSLink,
  useEventGroupsFindEventGroupByAlias,
  useUsersGetMe,
} from "@/lib/events";
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
import { useRouter } from "next/navigation";
import React, { useRef } from "react";

export type Props = {
  params: { alias: string };
};

export default function Page({ params: { alias } }: Props) {
  const router = useRouter();
  const { data: user } = useUsersGetMe();
  const { data: group } = useEventGroupsFindEventGroupByAlias({ alias });

  const copyButtonRef = useRef(null);

  const { context, refs } = useFloating({
    open: true,
    onOpenChange: () => router.back(),
  });

  // Transition effect
  const { isMounted, styles: transitionStyles } = useTransitionStyles(context);

  // Event listeners to change the open state
  const dismiss = useDismiss(context, { outsidePressEvent: "mousedown" });
  // Role props for screen readers
  const role = useRole(context);

  const { getFloatingProps } = useInteractions([dismiss, role]);

  const calendarURL =
    group !== undefined ? getICSLink(group.alias, user?.id, "url") : undefined;

  return (
    <>
      {isMounted && (
        <FloatingPortal>
          <FloatingOverlay
            className="@container/export z-10 grid place-items-center bg-black/75"
            lockScroll
          >
            <FloatingFocusManager
              context={context}
              initialFocus={copyButtonRef}
            >
              <div
                ref={refs.setFloating}
                style={transitionStyles}
                {...getFloatingProps()}
                className="flex p-4"
              >
                <div className="h-fit max-w-2xl overflow-hidden rounded-2xl bg-primary-main">
                  <div className="flex flex-col p-4 @lg/export:p-8">
                    <div className="flex w-full flex-row mb-2">
                      <div className="grow items-center text-3xl font-semibold">
                        Export to your calendar
                      </div>
                      <button
                        className="-mt-2 -mr-2 w-52 h-52 rounded-2xl p-2 text-icon-main/50 hover:bg-primary-hover/50 hover:text-icon-hover/75 @lg/export:-mt-6 @lg/export:-mr-6"
                        onClick={() => router.back()}
                      >
                        <span className="icon-[material-symbols--close] text-4xl" />
                      </button>
                    </div>
                    <div className="text-text-secondary/75">
                      You can add the schedule to your favorite calendar
                      application and it will be updated on schedule changes.
                    </div>
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
                    { /* TODO: Determine what to do with calendar margin */ }
                    <div className="-mx-4 -mb-4 lg:-mx-8 lg:-mb-8">
                      <Calendar
                        urls={calendarURL ? [calendarURL] : []}
                        viewId="popup"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </FloatingFocusManager>
          </FloatingOverlay>
        </FloatingPortal>
      )}
    </>
  );
}
