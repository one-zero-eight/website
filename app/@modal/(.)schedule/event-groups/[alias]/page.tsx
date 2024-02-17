"use client";
import Calendar from "@/components/common/calendar/Calendar";
import ExportButton from "@/components/schedule/ExportButton";
import FavoriteButton from "@/components/schedule/group-card/FavoriteButton";
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
import React from "react";

export type Props = {
  params: { alias: string };
};

export default function Page({ params: { alias } }: Props) {
  const router = useRouter();
  const { data: user } = useUsersGetMe();
  const { data: group } = useEventGroupsFindEventGroupByAlias({ alias });

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

  return (
    <>
      {isMounted && (
        <FloatingPortal>
          <FloatingOverlay
            className="@container/event z-10 grid place-items-center bg-black/75"
            lockScroll
          >
            <FloatingFocusManager context={context}>
              <div
                ref={refs.setFloating}
                style={transitionStyles}
                {...getFloatingProps()}
                className="flex p-4"
              >
                { /* TODO: Replace lg with appropriate breakpoint from queries */ }
                <div className="h-fit max-w-3xl overflow-hidden rounded-2xl bg-primary-main @lg/event:w-[768px]">
                  <div
                    style={{ backgroundImage: "url(/background-pattern.svg)" }}
                    className="flex h-64 w-full items-start justify-end bg-secondary-main bg-repeat"
                  >
                    <div className="flex flex-row gap-4 mr-2">
                      <button
                        className="mt-2 w-52 h-52 rounded-2xl p-2 text-icon-main/50 hover:bg-primary-hover/50 hover:text-icon-hover/75"
                        onClick={() => window.location.reload()}
                      >
                        <span className="icon-[material-symbols--open-in-full] text-4xl" />
                      </button>
                      <button
                        className="mt-2 w-52 h-52 rounded-2xl p-2 text-icon-main/50 hover:bg-primary-hover/50 hover:text-icon-hover/75"
                        onClick={() => router.back()}
                      >
                      <span className="icon-[material-symbols--close] text-4xl" />
                    </button>
                    </div>
                  </div>
                  {group && (
                    <div className="flex flex-col p-4 @lg/event:p-8">
                      <div className="mb-4 flex items-start justify-between gap-4">
                        <div className="min-h-full flex-grow">
                          <h1 className="text-3xl font-semibold">
                            {group.name}
                          </h1>
                          <p className="mt-2 whitespace-pre-wrap text-base text-text-secondary/75">
                            {group.description ||
                              "Hello world, this is a long description about my life and this elective."}
                          </p>
                        </div>
                        <FavoriteButton groupId={group.id} />
                      </div>
                      <h2 className="my-4 flex text-3xl font-medium">Tags</h2>
                      <div className="flex flex-wrap gap-2">
                        {group.tags?.map((tag) => (
                          <div
                            key={tag.id}
                            className="flex w-fit rounded-2xl bg-secondary-main px-4 py-2"
                          >
                            {tag.name}
                          </div>
                        ))}
                      </div>
                      <div className="my-4 flex flex-row flex-wrap items-center">
                        <h2 className="flex grow text-3xl font-medium">
                          Calendar
                        </h2>
                        <ExportButton alias={group.alias} />
                      </div>
                      { /* TODO: Determine what to do with calendar margin */ }
                      <div className="-mx-4 -mb-4 lg:-mx-8 lg:-mb-8">
                        <Calendar
                          urls={[getICSLink(group.alias, user?.id)]}
                          viewId="popup"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </FloatingFocusManager>
          </FloatingOverlay>
        </FloatingPortal>
      )}
    </>
  );
}
