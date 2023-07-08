import DownloadIcon from "@/components/icons/DownloadIcon";
import FavoriteIcon from "@/components/icons/FavoriteIcon";
import { useEventGroup } from "@/lib/event-group";
import { ViewEventGroup } from "@/lib/events";
import { viewConfig } from "@/lib/events-view-config";
import { Fragment, useState } from "react";
import { HideIcon } from "@/components/icons/HideIcon";
import { PredefinedIcon } from "@/components/icons/PredefinedIcon";

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
        <p className="text-text-main text-left text-xl font-medium w-40">
          {group.name}
        </p>
        {group.satellite &&
          satelliteToDisplay.map((v) => (
            <Fragment key={v}>
              {group.satellite && (
                <p className="text-xl text-inactive text-left font-medium">
                  {group.satellite[v]}
                </p>
              )}
            </Fragment>
          ))}
      </div>
      <div className="flex flex-row gap-3 place-items-center select-none w-fit">
        {canHide && (
          <div
            onClick={switchHideFavorite}
            className="cursor-pointer rounded-full"
          >
            <HideIcon
              active={isHidden}
              className="mt-1 fill-icon-main/50 hover:fill-icon-hover/75"
            />
          </div>
        )}
        <div onClick={switchFavorite}>
          {isPredefined ? (
            <PredefinedIcon />
          ) : (
            <FavoriteIcon active={isInFavorites} />
          )}
        </div>
        <div onClick={onImportClick} className="cursor-pointer rounded-full">
          <DownloadIcon className="fill-icon-main/50 hover:fill-icon-hover/75" />
        </div>
      </div>
    </div>
  );
}
