import { $events, eventsTypes } from "@/api/events";
import { CategoryContainer } from "@/components/schedule/CategoryContainer.tsx";
import { GroupCard } from "@/components/schedule/group-card/GroupCard";
import SearchBar from "@/components/schedule/SearchBar";
import { GroupCardTagSkeleton } from "@/components/schedule/skeletons/GroupCardTagSkeleton";
import { getFirstTagByType } from "@/lib/events/event-group";
import {
  getCategoryInfoBySlug,
  viewConfig,
} from "@/lib/events/events-view-config";
import { preprocessText } from "@/lib/utils/searchUtils";
import { Link } from "@tanstack/react-router";
import clsx from "clsx";
import Fuse from "fuse.js";
import React, { useEffect, useMemo, useState } from "react";

export default function SchedulePage({
  category,
}: {
  category: string | null;
}) {
  const categoryInfo = getCategoryInfoBySlug(category ?? "");
  const { data, isPending, error, refetch } = $events.useQuery(
    "get",
    "/event-groups/",
  );

  const [filters, setFilters] = useState<{ [key: string]: string | undefined }>(
    {},
  );
  const [search, setSearch] = useState("");

  const tagsFilter = ([] as string[])
    .concat(
      categoryInfo !== undefined ? [categoryInfo.alias] : ([] as string[]),
    )
    .concat(Object.values(filters).filter((v) => v !== undefined) as string[]);

  useEffect(() => {
    setFilters({});
  }, [category]);

  // Create a fuse instance from event_groups
  const fuse = useMemo(() => {
    if (!data?.event_groups) return null;

    // Extend index to include alternative spellings
    const extendedEventGroups = data.event_groups.map((group) => ({
      ...group,
      searchKeys: preprocessText(group.name ?? ""), // Store multiple search representations
    }));

    return new Fuse(extendedEventGroups, {
      keys: ["searchKeys"], // Search through all possible variants
      threshold: 0.3,
    });
  }, [data?.event_groups]);

  //
  const filteredByFuzzaSearch = useMemo(() => {
    if (!fuse || !search) return data?.event_groups || [];

    // Preprocess user input
    const processedSearchTerms = preprocessText(search);

    // Search using all variants
    const result = processedSearchTerms.flatMap((term) => fuse.search(term));

    // Remove duplicates and return matches
    const uniqueResults = Array.from(new Set(result.map((res) => res.item)));
    return uniqueResults;
  }, [search, fuse, data?.event_groups]);

  // Apply filters and group elements
  const groups = filteredByFuzzaSearch
    // Filter by tags
    .filter((v) =>
      tagsFilter.every(
        (tag) => v.tags?.findIndex((t) => t.alias === tag) !== -1,
      ),
    )
    // Filter by search

    // Sort by alias
    .sort((a, b) => a.alias.localeCompare(b.alias))
    // Group by tag
    .reduce(
      (acc, v) => {
        let tag = "";
        if (categoryInfo?.groupingTagType !== undefined) {
          tag = getFirstTagByType(v, categoryInfo?.groupingTagType)?.name || "";
        }
        if (acc[tag] === undefined) acc[tag] = [];
        acc[tag].push(v);
        return acc;
      },
      {} as { [key: string]: eventsTypes.SchemaViewEventGroup[] },
    );

  if (error) {
    return (
      <div className="flex flex-col justify-center gap-2 p-4">
        <h2 className="text-xl font-bold">Error Loading Schedule</h2>
        <p className="text-inactive">
          {(error as any).message ||
            "An error occurred while fetching the data. Please try again later."}
        </p>
        <button
          onClick={refetch}
          className="w-fit rounded-md text-brand-violet"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex shrink-0 flex-col whitespace-nowrap @3xl/content:flex-row">
        <div className="flex grow flex-row overflow-x-auto whitespace-nowrap">
          <div className="w-2 shrink-0 border-b-[1px] border-b-secondary-hover @3xl/content:w-1" />
          {Object.values(viewConfig.categories).map((v) => (
            <Link
              key={v.alias}
              to="/schedule/$category"
              params={{ category: v.alias }}
              className={clsx(
                "px-2 py-1",
                v.alias === category
                  ? "border-b-2 border-b-brand-violet"
                  : "border-b-[1px] border-b-secondary-hover",
              )}
            >
              {v.title}
            </Link>
          ))}
          <div className="min-w-2 grow border-b-[1px] border-b-secondary-hover" />
        </div>
        {categoryInfo && <SearchBar value={search} onChange={setSearch} />}
      </div>

      {!categoryInfo ? (
        <CategoryContainer />
      ) : isPending ? (
        <div className="flex flex-col gap-2 px-4">
          <GroupCardTagSkeleton />
          <GroupCardTagSkeleton />
        </div>
      ) : groups && Object.keys(groups).length > 0 ? (
        <div className="flex flex-col gap-2 px-4">
          {Object.keys(groups)
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
            ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2 px-4">No groups found</div>
      )}
    </>
  );
}
