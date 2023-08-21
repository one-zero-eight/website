import CloseIcon from "@/components/icons/CloseIcon";
import DownloadIcon from "@/components/icons/DownloadIcon";
import FavoriteIcon from "@/components/icons/FavoriteIcon";
import { PredefinedIcon } from "@/components/icons/PredefinedIcon";
import SignInPopup from "@/components/SignInPopup";
import Tooltip from "@/components/Tooltip";
import { useEventGroup } from "@/lib/event-group";
import { useUsersGetMe, ViewEventGroup } from "@/lib/events";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { useWindowSize } from "usehooks-ts";

type EventGroupPageProps = {
  groupData: ViewEventGroup;
  isPopup: boolean;
};
export function EventGroupPage({ groupData, isPopup }: EventGroupPageProps) {
  const router = useRouter();
  const { width } = useWindowSize();
  const [signInOpened, setSignInOpened] = useState(false);
  const { data, isError } = useUsersGetMe();
  const { switchFavorite, isInFavorites, isPredefined } = useEventGroup(
    groupData.id,
  );
  return !isPopup ? (
    <>
      <div className="flex flex-col items-center p-16 lg:[align-items:normal]">
        <div className="flex flex-col">
          <div className="flex flex-col justify-between lg:flex-row">
            <div className="flex w-full flex-col lg:flex-row">
              <h1 className="text-center text-3xl font-bold text-text-main lg:text-left lg:text-4xl">
                {groupData.name}
              </h1>
              <p className="whitespace-pre-wrap text-center text-text-secondary/75 lg:invisible lg:hidden lg:text-left">
                {groupData.description || ""}
              </p>
            </div>
            <div className="mt-8 flex flex-row items-center justify-center gap-4 lg:flex-row lg:justify-normal lg:[align-items:normal]">
              <Tooltip content={"Import to your calendar"}>
                <Link
                  href={`/schedule/event-groups/${groupData.alias}/import`}
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
                    if (isError || !data) {
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
          <p className="invisible hidden whitespace-pre-wrap text-center text-text-secondary/75 lg:visible lg:block xl:text-left">
            {groupData.description || ""}
          </p>
        </div>
        <div className="my-8 flex flex-col items-center justify-center gap-y-4 lg:justify-normal lg:[align-items:normal]">
          <h2 className="flex text-center text-3xl font-medium text-text-main xl:text-left">
            Tags
          </h2>
          <div className="flex gap-2">
            {groupData.tags?.map((tag) => (
              <div
                key={tag.id}
                className="flex w-fit rounded-3xl bg-secondary-main px-4 py-2"
              >
                <p className="text-text-main">{tag.name}</p>
              </div>
            ))}
          </div>
        </div>
        <SignInPopup
          header={"Sign in to get access"}
          description={
            "Save your favorite schedule in the dashboard with your Innopolis account."
          }
          isOpen={signInOpened}
          setIsOpen={setSignInOpened}
        />
        <h2 className="flex text-center text-3xl font-medium text-text-main xl:text-left">
          Calendar
        </h2>
      </div>
    </>
  ) : (
    <>
      <div className="h-fit max-w-2xl overflow-hidden rounded-xl bg-primary-main">
        <div className="text-xl font-bold">
          <div className="flex w-full flex-row">
            <div className="grow items-center pl-4 pt-6 text-text-main sm:pl-8">
              {groupData.name}
            </div>
            <button className="rounded-xl" onClick={() => router.back()}>
              <CloseIcon className="hover:fill-icon_hover w-10 fill-icon-main/50" />
            </button>
          </div>
        </div>
        <div className="px-4 sm:px-8">
          <div className="whitespace-pre-wrap text-text-secondary/75">
            {groupData.description || ""}
          </div>
        </div>
        <h2 className="flex text-center text-3xl font-medium text-text-main xl:text-left">
          Calendar
        </h2>
      </div>
    </>
  );
}
