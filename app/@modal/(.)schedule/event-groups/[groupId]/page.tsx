"use client";
import { useEventGroupsGetEventGroup } from "@/lib/events";
import { SCHEDULE_API_URL } from "@/lib/schedule/api";
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
import { EventGroupPage } from "@/components/EventGroupPage";
import Calendar from "@/components/Calendar";
import { useWindowSize } from "usehooks-ts";
import CloseIcon from "@/components/icons/CloseIcon";

export type Props = {
  params: { groupId: string };
};

export default function Page({ params }: Props) {
  const router = useRouter();
  const groupId = Number(params.groupId);
  const { data } = useEventGroupsGetEventGroup(groupId);

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
    data !== undefined ? `${SCHEDULE_API_URL}/${data.path}` : undefined;

  const { width } = useWindowSize();
  if (!data) return <>Loading...</>;
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
                className="flex-row my-32 mx-64 w-max max-w-3xl"
              >
                <div className="flex flex-row shrink-0 w-full">
                  <div className="rounded-2xl h-fit overflow-hidden bg-primary-main p-2">
                    <button
                      className="rounded-xl p-4"
                      onClick={() => router.back()}
                    >
                      <CloseIcon className="fill-icon-main/50 hover:fill-icon_hover w-10" />
                    </button>
                    <EventGroupPage groupData={data} isPopup={true} />
                    <div className="px-2">
                      <Calendar
                        urls={
                          data.path ? [`${SCHEDULE_API_URL}/${data.path}`] : []
                        }
                        initialView={
                          width
                            ? width >= 1280
                              ? "dayGridMonth"
                              : width >= 1024
                              ? "timeGridWeek"
                              : "listMonth"
                            : "dayGridMonth"
                        }
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
