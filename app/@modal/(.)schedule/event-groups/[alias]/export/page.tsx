"use client";
import Calendar from "@/components/Calendar";
import CloseIcon from "@/components/icons/CloseIcon";
import LinkIcon from "@/components/icons/LinkIcon";
import QuestionIcon from "@/components/icons/QuestionIcon";
import ScheduleLinkCopy from "@/components/ScheduleLinkCopy";
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
            className="z-10 grid place-items-center bg-black/75"
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
                  <div className="flex flex-col p-4 lg:p-8">
                    <div className="flex w-full flex-row">
                      <div className="grow items-center text-3xl font-semibold">
                        Export to your calendar
                      </div>
                      <button
                        className="-mr-4 -mt-4 rounded-2xl fill-icon-main/50 p-4 hover:bg-primary-hover/50 hover:fill-icon-hover/75 lg:-mr-8 lg:-mt-8"
                        onClick={() => router.back()}
                      >
                        <CloseIcon width={40} height={40} />
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
                          className="ml-4 flex w-fit flex-row items-baseline gap-x-2 underline"
                          href="https://calendar.google.com/calendar/u/0/r/settings/addbyurl"
                          target="_blank"
                        >
                          <LinkIcon className="h-4 w-4 fill-icon-main/50 hover:fill-icon-hover/75" />
                          Google Calendar
                        </a>
                        <a className="ml-4 flex w-fit flex-row items-baseline gap-x-2">
                          <QuestionIcon className="h-4 w-4 fill-icon-main/50 hover:fill-icon-hover/75" />
                          Other applications: find in settings
                        </a>
                      </li>
                      <li>Paste the link and click Add.</li>
                    </ul>
                    <div className="-mx-4 -mb-4 lg:-mx-8 lg:-mb-8">
                      <Calendar urls={calendarURL ? [calendarURL] : []} />
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
