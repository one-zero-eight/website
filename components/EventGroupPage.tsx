import React, { useState } from "react";
import { useUsersGetMe, ViewEventGroup } from "@/lib/events";
import { useWindowSize } from "usehooks-ts";
import Tooltip from "@/components/Tooltip";
import Link from "next/link";
import DownloadIcon from "@/components/icons/DownloadIcon";
import { useEventGroup } from "@/lib/event-group";
import SignInPopup from "@/components/SignInPopup";
import { PredefinedIcon } from "@/components/icons/PredefinedIcon";
import FavoriteIcon from "@/components/icons/FavoriteIcon";
import { useRouter } from "next/navigation";

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
    groupData.id
  );
  const tagsInfo: { [key: string]: string } = {
    "core course": "Core Courses",
    elective: "Electives",
    sports: "Sports",
    none: "Not found",
  };
  const type = groupData.type || "none";
  return (
    <>
      <div className="p-16 items-center lg:[align-items:normal] flex flex-col">
        <div className="flex flex-col">
          <div className="flex flex-row justify-between">
            <div className="flex flex-row w-full">
              <h1 className="text-text-main text-center lg:text-left text-3xl lg:text-4xl font-bold">
                {groupData.name}
              </h1>
            </div>
            <div className="flex flex-row mt-8 gap-4">
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
          <p className="text-center xl:text-left text-text-secondary/75">
            {groupData.satellite?.description || ""}
          </p>
        </div>
        <div className="flex flex-col my-8 gap-y-4">
          <h2 className="flex text-text-main text-center xl:text-left text-3xl font-medium">
            Tags
          </h2>
          <div className="flex rounded-3xl bg-secondary-main w-fit py-2 px-4">
            <p className="text-text-main">{tagsInfo[type]}</p>
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
  );
}
