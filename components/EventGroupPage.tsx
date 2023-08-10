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
      <div className="p-16 items-center lg:[align-items:normal] flex flex-col">
        <div className="flex flex-col">
          <div className="flex flex-col lg:flex-row justify-between">
            <div className="flex flex-col lg:flex-row w-full">
              <h1 className="text-text-main text-center lg:text-left text-3xl lg:text-4xl font-bold">
                {groupData.name}
              </h1>
              <p className="text-center lg:hidden lg:invisible lg:text-left text-text-secondary/75">
                {groupData.description || ""}
              </p>
            </div>
            <div className="flex flex-row justify-center items-center lg:[align-items:normal] lg:justify-normal lg:flex-row mt-8 gap-4">
              <Tooltip content={"Import to your calendar"}>
                <Link
                  href={`/schedule/event-groups/${groupData.id}/import`}
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
          <p className="hidden invisible lg:block lg:visible text-center xl:text-left text-text-secondary/75">
            {groupData.description || ""}
          </p>
        </div>
        <div className="flex flex-col justify-center lg:justify-normal lg:[align-items:normal] items-center my-8 gap-y-4">
          <h2 className="flex text-text-main text-center xl:text-left text-3xl font-medium">
            Tags
          </h2>
          <div className="flex gap-2">
            {groupData.tags?.map((tag) => (
              <div
                key={tag.id}
                className="flex rounded-3xl bg-secondary-main w-fit py-2 px-4"
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
        <h2 className="flex text-text-main text-center xl:text-left text-3xl font-medium">
          Calendar
        </h2>
      </div>
    </>
  ) : (
    <>
      <div className="max-w-2xl h-fit rounded-xl bg-primary-main overflow-hidden">
        <div className="text-xl font-bold">
          <div className="flex flex-row w-full">
            <div className="text-text-main grow items-center pl-4 sm:pl-8 pt-6">
              {groupData.name}
            </div>
            <button className="rounded-xl" onClick={() => router.back()}>
              <CloseIcon className="fill-icon-main/50 hover:fill-icon_hover w-10" />
            </button>
          </div>
        </div>
        <div className="px-4 sm:px-8">
          <div className="text-text-secondary/75">
            {groupData.description || ""}
          </div>
        </div>
        <h2 className="flex text-text-main text-center xl:text-left text-3xl font-medium">
          Calendar
        </h2>
      </div>
    </>
  );
}
