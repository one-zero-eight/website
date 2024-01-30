import FavoriteButton from "@/components/schedule/group-card/FavoriteButton";
import HideButton from "@/components/schedule/group-card/HideButton";
import {
  getAllTagsByType,
  getFirstTagByType,
} from "@/lib/event-group";
import { ViewEventGroup } from "@/lib/events";
import { viewConfig } from "@/lib/events-view-config";
import { useRouter } from "next/navigation";
import { Fragment } from "react";

export type GroupCardProps = {
  group: ViewEventGroup;
  canHide?: boolean;
};

export function GroupCard({ group, canHide = false }: GroupCardProps) {
  const router = useRouter();
  const category = getFirstTagByType(group, "category");
  const tagsToDisplay =
    category && category.alias in viewConfig.categories
      ? viewConfig.categories[category.alias].showTagTypes
      : [];
  const eventGroupPageURL = `/schedule/event-groups/${group.alias}`;
  const outdated =
    category &&
    category.alias in viewConfig.categories &&
    viewConfig.categories[category.alias].outdated;

  return (
    <div
      className="flex min-h-fit min-w-fit max-w-full basis-72 cursor-pointer flex-row items-center justify-between rounded-2xl bg-primary-main p-4 hover:bg-primary-hover"
      onClick={() => router.push(eventGroupPageURL)}
      onMouseEnter={() => router.prefetch(eventGroupPageURL)}
    >
      <div className="flex flex-col gap-0.5">
        <p className="text-xl font-medium">{group.name}</p>
        {tagsToDisplay.length > 0 &&
          tagsToDisplay.map((v) => {
            const tags = getAllTagsByType(group, v);
            if (tags.length === 0) return null;
            return (
              <Fragment key={v}>
                {tags.map((tag) => (
                  <p key={tag.id} className="text-inactive">
                    {tag.name}
                  </p>
                ))}
              </Fragment>
            );
          })}
        {outdated && (
          <p className="mt-1 w-fit rounded-xl border border-dashed border-red-500 px-2 py-1 text-sm text-red-500 blur-0">
            Outdated
          </p>
        )}
      </div>
      <div className="flex select-none flex-row place-items-center">
        {canHide && (
          <HideButton groupId={group.id} />
        )}
          <FavoriteButton groupId={group.id} />
      </div>
    </div>
  );
}
