import DownloadIcon from "@/components/icons/DownloadIcon";
import FavoriteIcon from "@/components/icons/FavoriteIcon";
import { HideIcon } from "@/components/icons/HideIcon";
import { PredefinedIcon } from "@/components/icons/PredefinedIcon";
import Tooltip from "@/components/Tooltip";
import { useEventGroup } from "@/lib/event-group";
import { ViewEventGroup } from "@/lib/events";
import { viewConfig } from "@/lib/events-view-config";
import { Fragment, useState } from "react";
import { useWindowSize } from "usehooks-ts";

export type GroupCardProps = {
  group: ViewEventGroup;
  onImportClick?: () => void;
  canHide?: boolean;
};

export function GroupCard({
  group,
  onImportClick,
  canHide = false,
}: GroupCardProps) {
  const { width } = useWindowSize();
  const [isShowing, setIsShowing] = useState(false);
  const {
    switchFavorite,
    isInFavorites,
    isHidden,
    isPredefined,
    switchHideFavorite,
  } = useEventGroup(group.id);
  const satelliteToDisplay = group.type
    ? viewConfig.types[group.type].showAdditionalInfo
    : [];
  return (
    <div className="bg-primary-main hover:bg-primary-hover flex flex-row justify-between items-center sm:text-2xl px-7 py-5 my-2 rounded-3xl min-w-fit min-h-fit">
      <div className="flex flex-col gap-0.5">
        <p className="text-text-main text-left text-lg sm:text-xl font-medium w-40">
          {group.name}
        </p>
        {group.satellite &&
          satelliteToDisplay.map((v) => (
            <Fragment key={v}>
              {group.satellite && (
                <p className="text-lg sm:text-xl text-inactive text-left font-medium">
                  {group.satellite[v]}
                </p>
              )}
            </Fragment>
          ))}
      </div>
      <div className="flex flex-row gap-3 place-items-center select-none w-fit">
        {canHide && (
          <Tooltip
            tip={isHidden ? "Hidden from calendar" : "Hide from calendar"}
          >
            <div
              onClick={switchHideFavorite}
              className="cursor-pointer rounded-full"
            >
              <HideIcon
                active={isHidden}
                width={width >= 640 ? 40 : 36}
                height={width >= 640 ? 40 : 36}
                className="mt-1 fill-icon-main/50 hover:fill-icon-hover/75"
              />
            </div>
          </Tooltip>
        )}
        <div onClick={switchFavorite} className="cursor-pointer rounded-full">
          {isPredefined ? (
            <Tooltip tip={"Your group from official lists"}>
              <PredefinedIcon
                width={width >= 640 ? 40 : 36}
                height={width >= 640 ? 40 : 36}
              />
            </Tooltip>
          ) : (
            <Tooltip tip={isInFavorites ? "In favorites" : "Add to favorites"}>
              <FavoriteIcon
                active={isInFavorites}
                width={width >= 640 ? 40 : 36}
                height={width >= 640 ? 40 : 36}
              />
            </Tooltip>
          )}
        </div>
        <div onClick={onImportClick} className="cursor-pointer rounded-full">
          <Tooltip tip={"Import to your calendar"}>
            <DownloadIcon
              className="fill-icon-main/50 hover:fill-icon-hover/75"
              width={width >= 640 ? 48 : 40}
              height={width >= 640 ? 48 : 40}
            />
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
