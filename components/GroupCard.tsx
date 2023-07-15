import DownloadIcon from "@/components/icons/DownloadIcon";
import FavoriteIcon from "@/components/icons/FavoriteIcon";
import { HideIcon } from "@/components/icons/HideIcon";
import { PredefinedIcon } from "@/components/icons/PredefinedIcon";
import Tooltip from "@/components/Tooltip";
import { useEventGroup } from "@/lib/event-group";
import { useUsersGetMe, ViewEventGroup } from "@/lib/events";
import { viewConfig } from "@/lib/events-view-config";
import { Fragment } from "react";
import { useIsClient, useWindowSize } from "usehooks-ts";

export type GroupCardProps = {
  group: ViewEventGroup;
  askToSignIn?: () => void;
  onImportClick?: () => void;
  canHide?: boolean;
};

export function GroupCard({
  group,
  askToSignIn,
  onImportClick,
  canHide = false,
}: GroupCardProps) {
  const { width } = useWindowSize();
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
  const { data, isError } = useUsersGetMe();
  return (
    <div
      className="cursor-pointer bg-primary-main hover:bg-primary-hover flex flex-row justify-between items-center sm:text-2xl px-7 py-5 my-2 rounded-3xl min-w-fit min-h-fit"
      onClick={onImportClick}
    >
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
      <div className="flex flex-row place-items-center select-none w-fit">
        {canHide && (
          <Tooltip
            content={isHidden ? "Hidden from calendar" : "Hide from calendar"}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                switchHideFavorite && switchHideFavorite();
              }}
              className="rounded-full p-2 hover:bg-secondary-hover"
            >
              <HideIcon
                active={isHidden}
                width={width >= 640 ? 40 : 36}
                height={width >= 640 ? 40 : 36}
                className="fill-icon-main/50 hover:fill-icon-hover/75"
              />
            </button>
          </Tooltip>
        )}
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
                askToSignIn && askToSignIn();
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
        <Tooltip content={"Import to your calendar"}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onImportClick && onImportClick();
            }}
            className="rounded-full p-2 hover:bg-secondary-hover"
          >
            <DownloadIcon
              className="fill-icon-main/50 hover:fill-icon-hover/75"
              width={width >= 640 ? 48 : 40}
              height={width >= 640 ? 48 : 40}
            />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
