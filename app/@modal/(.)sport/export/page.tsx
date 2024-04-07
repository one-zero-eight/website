"use client";
import Calendar from "@/components/common/calendar/Calendar";
import ScheduleLinkCopy from "@/components/schedule/ScheduleLinkCopy";
import { events, getMySportLink, getPersonalLink } from "@/lib/events";
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
import React, { useEffect, useRef } from "react";

export default function Page() {
  const router = useRouter();
  const { data: eventsUser } = events.useUsersGetMe();

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

  const {
    mutate: generateScheduleKey,
    isPending,
    data: scheduleKey,
  } = events.useUsersGenerateUserScheduleKey();

  useEffect(() => {
    if (eventsUser === undefined) return;
    if (isPending) return;
    if (scheduleKey !== undefined) return;
    generateScheduleKey({
      params: {
        resource_path: `/users/${eventsUser?.id}/sport.ics`,
      },
    });
  });

  return (
    <>
      {isMounted && (
        <FloatingPortal>
          <FloatingOverlay
            className="z-10 grid place-items-center bg-black/75 @container/export"
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
                className="flex h-fit w-full flex-col p-4 @2xl/export:w-3/4 @5xl/export:w-1/2"
              >
                <div className="overflow-hidden rounded-2xl bg-popup">
                  <div className="flex flex-col p-4 @2xl/export:p-8">
                    {/* Heading and description */}
                    <div className="mb-2 flex w-full flex-row">
                      <div className="grow items-center text-3xl font-semibold">
                        Export sport trainings
                      </div>
                      <button
                        className="-mr-2 -mt-2 h-52 w-52 rounded-2xl p-2 text-icon-main/50 hover:bg-primary-hover/50 hover:text-icon-hover/75 @lg/export:-mr-6 @lg/export:-mt-6"
                        onClick={() => router.back()}
                      >
                        <span className="icon-[material-symbols--close] text-4xl" />
                      </button>
                    </div>
                    <div className="text-text-secondary/75">
                      You can add your personal sport trainings schedule to your
                      favorite calendar application and it will be updated on
                      changes.
                    </div>
                    {/* Export steps */}
                    <ul className="my-4 list-decimal pl-5 text-text-secondary/75">
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
                        urls={[
                          {
                            url: getMySportLink(),
                            color: "seagreen",
                          },
                        ]}
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
