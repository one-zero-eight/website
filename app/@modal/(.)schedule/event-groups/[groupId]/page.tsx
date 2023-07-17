"use client";
import Calendar from "@/components/Calendar";
import CloseIcon from "@/components/icons/CloseIcon";
import DownloadIcon from "@/components/icons/DownloadIcon";
import { ExpandIcon } from "@/components/icons/ExpandIcon";
import FavoriteIcon from "@/components/icons/FavoriteIcon";
import { PredefinedIcon } from "@/components/icons/PredefinedIcon";
import Tooltip from "@/components/Tooltip";
import { useEventGroup } from "@/lib/event-group";
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
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { useWindowSize } from "usehooks-ts";

export type Props = {
  params: { groupId: string };
};

export default function Page({ params }: Props) {
  const router = useRouter();
  const groupId = Number(params.groupId);
  const { data } = useEventGroupsGetEventGroup(groupId);

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
  const [signInOpened, setSignInOpened] = useState(false);
  const { switchFavorite, isInFavorites, isPredefined } =
    useEventGroup(groupId);
  if (!data) return <>Loading...</>;
  const type = data.type || "none";
  const tagsInfo: { [key: string]: string } = {
    "core course": "Core Courses",
    elective: "Electives",
    sports: "Sports",
    none: "Not found",
  };
  return (
    <>
      {isMounted && (
        <FloatingPortal>
          <FloatingOverlay
            className="z-10 bg-black/75 place-items-center grid"
            lockScroll
          >
            <FloatingFocusManager context={context}>
              <div
                ref={refs.setFloating}
                style={transitionStyles}
                {...getFloatingProps()}
                className="flex p-4"
              >
                <div className="max-w-2xl h-fit rounded-xl bg-primary-main overflow-hidden">
                  <div
                    style={{ backgroundImage: "url(/background-pattern.svg)" }}
                    className="bg-repeat bg-secondary-main w-5/6 lg:w-256 h-64"
                  >
                    <button
                      className="rounded-2xl p-4 fill-icon-main/50 hover:fill-icon-hover/75"
                      onClick={() => router.back()}
                    >
                      <CloseIcon width={40} height={40} />
                    </button>
                    <button
                      className="rounded-2xl fill-icon-main/50 hover:fill-icon-hover/75"
                      onClick={() => window.location.reload()}
                    >
                      <ExpandIcon className="flex" width={36} height={36} />
                    </button>
                  </div>
                  <div className="flex flex-col lg:flex-row justify-center items-center shrink-0">
                    <h1 className="text-text-main lg:grow text-center lg:text-left sm:pl-8 pt-6 font-bold text-2xl xl:text-3xl">
                      {data.name}
                    </h1>
                    <p className="lg:hidden lg:invisible sm:pl-8 text-center lg:text-left w-4/6 text-text-secondary/75">
                      {data.satellite?.description ||
                        "Hello world, this is a long description about my life and this elective."}
                    </p>
                    <div className="flex flex-row justify-center items-center mt-8 mr-4 gap-4 w-fit">
                      <Tooltip content={"Import to your calendar"}>
                        <Link
                          href={`/schedule/event-groups/${data.id}/import`}
                          className="flex flex-row gap-2 justify-center items-center text-center text-text-main p-2 font-medium w-40 h-14 rounded-full border-focus_color bg-primary-main hover:bg-primary-hover border-2 text-xl"
                        >
                          <DownloadIcon
                            className="flex fill-icon-main"
                            width={36}
                            height={36}
                          />
                          Import
                        </Link>
                      </Tooltip>
                      <Tooltip
                        content={
                          isPredefined
                            ? "Your group from official lists"
                            : isInFavorites
                            ? "In favorites"
                            : "Add to favorites"
                        }
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!data) {
                              setSignInOpened(true);
                            } else {
                              switchFavorite && switchFavorite();
                            }
                          }}
                          className="rounded-full p-2 hover:bg-secondary-hover"
                        >
                          {isPredefined ? (
                            <PredefinedIcon
                              width={width >= 640 ? 40 : 36}
                              height={width >= 640 ? 40 : 36}
                            />
                          ) : (
                            <FavoriteIcon
                              active={isInFavorites}
                              width={width >= 640 ? 40 : 36}
                              height={width >= 640 ? 40 : 36}
                            />
                          )}
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                  <p className="hidden invisible lg:block lg:visible pl-8 text-center lg:text-left w-4/6 text-text-secondary/75">
                    {data.satellite?.description || ""}
                  </p>
                  <div className="sm:pl-8 flex flex-col justify-center items-center lg:[align-items:normal] lg:justify-normal my-8 gap-y-4">
                    <h2 className="flex text-text-main grow text-center xl:text-left text-3xl font-medium">
                      Tags
                    </h2>
                    <div className="flex rounded-3xl bg-secondary-main w-fit py-2 px-4">
                      <p className="text-text-main">{tagsInfo[type]}</p>
                    </div>
                  </div>
                  <h2 className="sm:pl-8 flex justify-center items-center lg:justify-normal lg:[align-items:normal] text-text-main text-center xl:text-left text-3xl font-medium">
                    Calendar
                  </h2>
                  <br />
                  <Calendar
                    urls={data.path ? [`${SCHEDULE_API_URL}/${data.path}`] : []}
                  />
                </div>
              </div>
            </FloatingFocusManager>
          </FloatingOverlay>
        </FloatingPortal>
      )}
    </>
  );
}
