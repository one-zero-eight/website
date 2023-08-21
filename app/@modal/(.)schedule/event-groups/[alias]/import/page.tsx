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
            className="z-10 bg-black/75 place-items-center grid"
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
                <div className="max-w-2xl h-fit rounded-xl bg-primary-main overflow-hidden">
                  <div className="text-xl font-bold">
                    <div className="flex flex-row w-full">
                      <div className="text-text-main grow items-center pl-4 sm:pl-8 pt-6">
                        Import to your calendar
                      </div>
                      <button
                        className="rounded-xl w-fit p-4"
                        onClick={() => router.back()}
                      >
                        <CloseIcon className="fill-icon-main/50 hover:fill-icon_hover w-10" />
                      </button>
                    </div>
                  </div>
                  <div className="px-4 sm:px-8">
                    <div className="text-text-secondary/75">
                      You can add the schedule to your favorite calendar
                      application and it will be updated on schedule changes.
                    </div>

                    <ul className="list-decimal pl-4 text-text-secondary/75 my-4">
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
                          className="underline ml-4 flex flex-row items-baseline gap-x-2 w-fit"
                          href="https://calendar.google.com/calendar/u/0/r/settings/addbyurl"
                          target="_blank"
                        >
                          <LinkIcon className="h-4 w-4 fill-icon-main/50 hover:fill-icon-hover/75" />
                          Google Calendar
                        </a>
                        <a className="ml-4 flex flex-row items-baseline gap-x-2 w-fit">
                          <QuestionIcon className="h-4 w-4 fill-icon-main/50 hover:fill-icon-hover/75" />
                          Other applications: find in settings
                        </a>
                      </li>
                      <li>Paste the link and click Add.</li>
                    </ul>
                  </div>

                  <br />

                  <Calendar urls={calendarURL ? [calendarURL] : []} />
                </div>
              </div>
            </FloatingFocusManager>
          </FloatingOverlay>
        </FloatingPortal>
      )}
    </>
  );
}
