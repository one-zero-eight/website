import { $events, eventsTypes } from "@/api/events";
import { CategoryContainer } from "@/components/schedule/CategoryContainer.tsx";
import { GroupCard } from "@/components/schedule/group-card/GroupCard";
import SearchBar from "@/components/schedule/SearchBar";
import { GroupCardTagSkeleton } from "@/components/schedule/skeletons/GroupCardTagSkeleton";
import { getFirstTagByType } from "@/api/events/event-group.ts";
import {
  getCategoryInfoBySlug,
  viewConfig,
} from "@/components/schedule/view-config.ts";
import { preprocessText } from "@/lib/utils/searchUtils";
import { Link } from "@tanstack/react-router";
import Fuse from "fuse.js";
import React, { useEffect, useMemo, useState } from "react";
import { ExportModal } from "@/components/calendar/ExportModal.tsx";
import { TargetForExport } from "@/api/events/types.ts";

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
    const extendedEventGroups = data?.event_groups.map((group) => ({
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

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [targetForExport, setTargetForExport] = useState<
    number | TargetForExport | null
  >(null);

  if (error) {
    return (
      <div className="flex flex-col justify-center gap-2 p-4">
        <h2 className="text-xl font-bold">Error Loading Schedule</h2>
        <p className="text-base-content/30">
          {(error as any).message ||
            "An error occurred while fetching the data. Please try again later."}
        </p>
        <button onClick={refetch} className="text-primary w-fit rounded-md">
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex shrink-0 flex-col whitespace-nowrap @3xl/content:flex-row">
        <div className="flex grow flex-row overflow-x-auto whitespace-nowrap">
          <div className="border-base-300 w-2 shrink-0 border-b @3xl/content:w-1" />
          {Object.values(viewConfig.categories).map((v) => (
            <Link
              key={v.alias}
              to="/schedule/$category"
              params={{ category: v.alias }}
              className="px-2 py-1"
              activeOptions={{ exact: true, includeSearch: true }}
              activeProps={{ className: "border-b-2 border-b-primary" }}
              inactiveProps={{
                className: "border-b border-base-300",
              }}
            >
              {v.title}
            </Link>
          ))}
          <div className="border-b-base-300 min-w-2 grow border-b" />
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
                  <div className="text-base-content/30 flex items-center">
                    {groups[tagName].length} groups
                  </div>
                </div>

                <div className="mb-4 grid w-full grid-cols-1 gap-4 @lg/content:grid-cols-2 @4xl/content:grid-cols-3 @5xl/content:grid-cols-4">
                  {groups[tagName].map((group) => (
                    <GroupCard
                      key={group.path}
                      group={group}
                      exportButtonOnClick={() => {
                        setTargetForExport(group.id);
                        setExportModalOpen(true);
                      }}
                    />
                  ))}
                </div>
              </React.Fragment>
            ))}
          <ExportModal
            eventGroupOrTarget={targetForExport}
            open={exportModalOpen}
            onOpenChange={setExportModalOpen}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2 px-4">No groups found</div>
      )}
    </>
  );
}
