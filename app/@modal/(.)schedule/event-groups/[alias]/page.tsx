"use client";
import Calendar from "@/components/Calendar";
import CloseIcon from "@/components/icons/CloseIcon";
import DownloadIcon from "@/components/icons/DownloadIcon";
import { ExpandIcon } from "@/components/icons/ExpandIcon";
import FavoriteIcon from "@/components/icons/FavoriteIcon";
import { PredefinedIcon } from "@/components/icons/PredefinedIcon";
import Tooltip from "@/components/Tooltip";
import { useEventGroup } from "@/lib/event-group";
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
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { useWindowSize } from "usehooks-ts";

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

  const { width } = useWindowSize();
  const [signInOpened, setSignInOpened] = useState(false);
  const { switchFavorite, isInFavorites, isPredefined } = useEventGroup(
    group?.id,
  );
  if (!group) return <>Loading...</>;
  return (
    <>
      {isMounted && (
        <FloatingPortal>
          <FloatingOverlay
            className="z-10 grid place-items-center bg-black/75"
            lockScroll
          >
            <FloatingFocusManager context={context}>
              <div
                ref={refs.setFloating}
                style={transitionStyles}
                {...getFloatingProps()}
                className="flex p-4"
              >
                <div className="h-fit max-w-3xl overflow-hidden rounded-xl bg-primary-main">
                  <div
                    style={{ backgroundImage: "url(/background-pattern.svg)" }}
                    className="h-64 w-full bg-secondary-main bg-repeat lg:w-256"
                  >
                    <button
                      className="rounded-2xl fill-icon-main/50 p-4 hover:fill-icon-hover/75"
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
                  <div className="flex shrink-0 flex-col items-center justify-center lg:flex-row">
                    <h1 className="pt-6 text-center text-2xl font-bold text-text-main lg:grow lg:pl-8 lg:text-left xl:text-3xl">
                      {group.name}
                    </h1>
                    <p className="w-4/6 whitespace-pre-wrap text-center text-text-secondary/75 lg:invisible lg:hidden lg:pl-8 lg:text-left">
                      {group.description ||
                        "Hello world, this is a long description about my life and this elective."}
                    </p>
                    <div className="mr-4 mt-8 flex w-fit flex-row items-center justify-center gap-4">
                      <Tooltip content={"Import to your calendar"}>
                        <Link
                          href={`/schedule/event-groups/${group.alias}/import`}
                          className="flex h-14 w-40 flex-row items-center justify-center gap-2 rounded-full border-2 border-focus_color bg-primary-main p-2 text-center text-xl font-medium text-text-main hover:bg-primary-hover"
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
                            if (!group) {
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
                  <p className="invisible hidden w-4/6 whitespace-pre-wrap pl-8 text-center text-text-secondary/75 lg:visible lg:block lg:text-left">
                    {group.description || ""}
                  </p>
                  <div className="my-8 flex flex-col items-center justify-center gap-y-4 lg:justify-normal lg:pl-8 lg:[align-items:normal]">
                    <h2 className="flex grow text-center text-3xl font-medium text-text-main xl:text-left">
                      Tags
                    </h2>
                    <div className="flex gap-2">
                      {group.tags?.map((tag) => (
                        <div
                          key={tag.id}
                          className="flex w-fit rounded-3xl bg-secondary-main px-4 py-2"
                        >
                          <p className="text-text-main">{tag.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <h2 className="flex items-center justify-center text-center text-3xl font-medium text-text-main lg:justify-normal lg:pl-8 lg:[align-items:normal] xl:text-left">
                    Calendar
                  </h2>
                  <br />
                  <Calendar urls={[getICSLink(group.alias, user?.id)]} />
                </div>
              </div>
            </FloatingFocusManager>
          </FloatingOverlay>
        </FloatingPortal>
      )}
    </>
  );
}
