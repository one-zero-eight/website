"use client";
import { GroupCard } from "@/components/GroupCard";
import SearchBar from "@/components/SearchBar";
import SignInPopup from "@/components/SignInPopup";
import { getFirstTagByType } from "@/lib/event-group";
import { useEventGroupsListEventGroups } from "@/lib/events";
import { getCategoryInfoBySlug } from "@/lib/events-view-config";
import React, { useState } from "react";
import CategoriesDropdown from "./CategoriesDropdown";
import FilterDropdown from "./FilterDropdown";

export type ScheduleListProps = {
  category: string;
};

export default function ScheduleList({ category }: ScheduleListProps) {
  const categoryInfo = getCategoryInfoBySlug(category);
  const { data } = useEventGroupsListEventGroups();

  const [filters, setFilters] = useState<{ [key: string]: string | undefined }>(
    {},
  );
  const [search, setSearch] = useState("");
  const [signInOpened, setSignInOpened] = useState(false);

  const tagsFilter = ([] as string[])
    .concat(
      categoryInfo !== undefined ? [categoryInfo.alias] : ([] as string[]),
    )
    .concat(Object.values(filters).filter((v) => v !== undefined) as string[]);

  // Apply filters
  const groups = data?.groups
    .filter((v) =>
      tagsFilter.every(
        (tag) => v.tags?.findIndex((t) => t.alias === tag) !== -1,
      ),
    )
    .filter(
      (v) => v.name?.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
    )
    .sort((a, b) => {
      if (categoryInfo?.groupingTagType === undefined) return 0;
      const aTag = getFirstTagByType(a, categoryInfo.groupingTagType);
      const bTag = getFirstTagByType(b, categoryInfo.groupingTagType);
      if (aTag === undefined && bTag === undefined) return 0;
      if (aTag === undefined) return -1;
      if (bTag === undefined) return 1;
      return aTag.alias.localeCompare(bTag.alias);
    });

  let lastGroup: string | undefined = undefined;

  return (
    <>
      <div className="mt-4 flex flex-row flex-wrap justify-center gap-4 xl:justify-normal">
        <CategoriesDropdown category={category} />
        {categoryInfo?.filtersTagTypes.map((v) => (
          <FilterDropdown
            key={v}
            typeFilter={v}
            selected={filters[v] || ""}
            setSelected={(value) =>
              setFilters((prev) => ({ ...prev, [v]: value || undefined }))
            }
          />
        ))}
        <SearchBar
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={"Find the group..."}
          width={300}
        />
      </div>

      <hr className="border-b-1 mt-4 w-full border-border"></hr>

      <div className="justify-left scrollbar-hide mt-4 flex h-full w-full flex-wrap place-items-center content-start justify-center justify-items-stretch gap-x-10 gap-y-2 overflow-auto px-0 lg:justify-normal lg:px-4">
        {groups?.map((group) => {
          let groupTitle = undefined;
          const tagName = categoryInfo?.groupingTagType
            ? getFirstTagByType(group, categoryInfo.groupingTagType)?.name
            : undefined;
          if (
            categoryInfo?.groupingTagType !== undefined &&
            tagName !== undefined &&
            tagName !== lastGroup
          ) {
            groupTitle = (
              <div className="mb-4 ml-4 mt-8 w-full text-center text-3xl font-bold lg:text-left">
                {tagName}
              </div>
            );
            lastGroup = tagName;
          }
          return (
            <React.Fragment key={group.path}>
              {groupTitle}
              <GroupCard
                key={group.path}
                group={group}
                askToSignIn={() => {
                  setSignInOpened(true);
                }}
              />
            </React.Fragment>
          );
        })}
      </div>

      <SignInPopup
        header={"Sign in to get access"}
        description={
          "Save your favorite schedule in the dashboard with your Innopolis account."
        }
        isOpen={signInOpened}
        setIsOpen={setSignInOpened}
      />
    </>
  );
}
