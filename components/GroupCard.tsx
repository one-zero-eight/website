import FavoriteIcon from "@/components/icons/FavoriteIcon";
import { HideIcon } from "@/components/icons/HideIcon";
import { PredefinedIcon } from "@/components/icons/PredefinedIcon";
import Tooltip from "@/components/Tooltip";
import {
  getAllTagsByType,
  getFirstTagByType,
  useEventGroup,
} from "@/lib/event-group";
import { useUsersGetMe, ViewEventGroup } from "@/lib/events";
import { viewConfig } from "@/lib/events-view-config";
import { useRouter } from "next/navigation";
import { Fragment } from "react";
import { useWindowSize } from "usehooks-ts";

export type GroupCardProps = {
  group: ViewEventGroup;
  askToSignIn?: () => void;
  canHide?: boolean;
};

export function GroupCard({
  group,
  askToSignIn,
  canHide = false,
}: GroupCardProps) {
  const router = useRouter();
  const { width } = useWindowSize();
  const {
    switchFavorite,
    isInFavorites,
    isHidden,
    isPredefined,
    switchHideFavorite,
  } = useEventGroup(group.id);
  const category = getFirstTagByType(group, "category");
  const tagsToDisplay =
    category && category.alias in viewConfig.categories
      ? viewConfig.categories[category.alias].showTagTypes
      : [];
  const { data: user, isError } = useUsersGetMe();
  const eventGroupPageURL = `/schedule/event-groups/${group.alias}`;
  const outdated =
    category &&
    category.alias in viewConfig.categories &&
    viewConfig.categories[category.alias].outdated;

  return (
    <div
      className="my-2 flex min-h-fit min-w-fit cursor-pointer flex-row items-center justify-between rounded-3xl bg-primary-main py-5 pl-7 pr-5 hover:bg-primary-hover sm:text-2xl"
      onClick={() => router.push(eventGroupPageURL)}
      onMouseEnter={() => router.prefetch(eventGroupPageURL)}
    >
      <div className="flex w-32 flex-col gap-0.5 sm:w-60">
        <p className="text-left text-lg font-medium text-text-main sm:text-xl">
          {group.name}
        </p>
        {tagsToDisplay.length > 0 &&
          tagsToDisplay.map((v) => {
            const tags = getAllTagsByType(group, v);
            if (tags.length === 0) return null;
            return (
              <Fragment key={v}>
                {tags.map((tag) => (
                  <p
                    key={tag.id}
                    className="text-left text-lg font-medium text-inactive sm:text-xl"
                  >
                    {tag.name}
                  </p>
                ))}
              </Fragment>
            );
          })}
        {outdated && (
          <p className="mt-1 w-fit rounded-full border border-dashed border-red-500 px-2 py-1 text-sm text-red-500 blur-0">
            Outdated
          </p>
        )}
      </div>
      <div className="flex w-fit select-none flex-row place-items-center">
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
              if (isError || !user) {
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
      </div>
    </div>
  );
}
