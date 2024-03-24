"use client";
import { GroupCard } from "@/components/schedule/group-card/GroupCard";
import SearchBar from "@/components/schedule/SearchBar";
import { GroupCardTagSkeleton } from "@/components/schedule/skeletons/GroupCardTagSkeleton";
import { events } from "@/lib/events";
import { getFirstTagByType } from "@/lib/events/event-group";
import { getCategoryInfoBySlug } from "@/lib/events/events-view-config";
import React, { useState } from "react";
import CategoriesDropdown from "./CategoriesDropdown";
import FilterDropdown from "./FilterDropdown";

export type ScheduleListProps = {
  category: string;
};

export default function ScheduleList({ category }: ScheduleListProps) {
  const categoryInfo = getCategoryInfoBySlug(category);
  const { data } = events.useEventGroupsListEventGroups();

  const [filters, setFilters] = useState<{ [key: string]: string | undefined }>(
    {},
  );
  const [search, setSearch] = useState("");

  const tagsFilter = ([] as string[])
    .concat(
      categoryInfo !== undefined ? [categoryInfo.alias] : ([] as string[]),
    )
    .concat(Object.values(filters).filter((v) => v !== undefined) as string[]);

  // Apply filters and group elements
  const groups = !data
    ? {}
    : data.groups
        // Filter by tags
        .filter((v) =>
          tagsFilter.every(
            (tag) => v.tags?.findIndex((t) => t.alias === tag) !== -1,
          ),
        )
        // Filter by search
        .filter((v) =>
          v.name?.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
        )
        // Sort by alias
        .sort((a, b) => a.alias.localeCompare(b.alias))
        // Group by tag
        .reduce(
          (acc, v) => {
            let tag = "";
            if (categoryInfo?.groupingTagType !== undefined) {
              tag =
                getFirstTagByType(v, categoryInfo?.groupingTagType)?.name || "";
            }
            if (acc[tag] === undefined) acc[tag] = [];
            acc[tag].push(v);
            return acc;
          },
          {} as { [key: string]: events.ViewEventGroup[] },
        );

  return (
    <>
      <div className="mt-4 flex flex-row flex-wrap justify-center gap-4 @2xl/content:justify-between">
        <div className="flex flex-row flex-wrap justify-center gap-4 @2xl/content:justify-normal">
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
        </div>
        <div className="flex w-fit justify-self-end">
          <SearchBar
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={"Find the group..."}
            width={300}
          />
        </div>
      </div>

      <hr className="border-b-1 mt-4 w-full border-border" />
      {Object.keys(groups).length > 0 ? (
        Object.keys(groups)
          .sort()
          .map((tagName) => (
            <React.Fragment key={tagName}>
              <div className="my-4 flex w-full flex-wrap justify-between">
                <div className="text-3xl font-medium">{tagName}</div>
                <div className="flex items-center text-inactive">
                  {groups[tagName].length} groups
                </div>
              </div>

              <div className="mb-4 grid w-full grid-cols-1 gap-4 @lg/content:grid-cols-2 @4xl/content:grid-cols-3 @5xl/content:grid-cols-4">
                {groups[tagName].map((group) => (
                  <GroupCard key={group.path} group={group} />
                ))}
              </div>
            </React.Fragment>
          ))
      ) : (
        <React.Fragment>
          <GroupCardTagSkeleton />
          <GroupCardTagSkeleton />
        </React.Fragment>
      )}
    </>
  );
}
